#!/usr/bin/env python3
"""
Gina Haya — Real Biodynamic Calendar Generator
Combines: Maria Thun + Stella Natura + Pure Sidereal Zodiac
Uses: pyswisseph for astronomical calculations
"""

import swisseph as swe
import json
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional
import requests

# ═══════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
ISRAEL_TZ_OFFSET = 2  # UTC+2 (UTC+3 in summer, handle separately)
DAYS_TO_GENERATE = 400  # ~13 months ahead

# Swiss Ephemeris path (will use built-in if not set)
EPH_PATH = os.environ.get('SE_EPHE_PATH', '')
if EPH_PATH:
    swe.set_ephe_path(EPH_PATH)

# ═══════════════════════════════════════════════════════
# SIDEREAL ZODIAC — FAGAN/BRADLEY (used by Maria Thun)
# ═══════════════════════════════════════════════════════

# Maria Thun used Fagan/Bradley sidereal ayanamsa
AYANAMSA = swe.SIDM_FAGAN_BRADLEY

SIGN_NAMES_HE = [
    'טלה', 'שור', 'תאומים', 'סרטן', 'אריה', 'בתולה',
    'מאזניים', 'עקרב', 'קשת', 'גדי', 'דלי', 'דגים'
]
SIGN_NAMES_EN = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

# Biodynamic element mapping (Maria Thun / Stella Natura)
# Fire = Fruit, Earth = Root, Air = Flower, Water = Leaf
SIGN_ELEMENT = {
    0: 'fire',   # Aries — Fruit
    1: 'earth',  # Taurus — Root
    2: 'air',    # Gemini — Flower
    3: 'water',  # Cancer — Leaf
    4: 'fire',   # Leo — Fruit
    5: 'earth',  # Virgo — Root
    6: 'air',    # Libra — Flower
    7: 'water',  # Scorpio — Leaf
    8: 'fire',   # Sagittarius — Fruit
    9: 'earth',  # Capricorn — Root
    10: 'air',   # Aquarius — Flower
    11: 'water', # Pisces — Leaf
}

ELEMENT_TO_DAY_TYPE = {
    'fire':  'fruit',
    'earth': 'root',
    'air':   'flower',
    'water': 'leaf',
}

DAY_TYPE_HE = {
    'fruit':  'פרי',
    'root':   'שורש',
    'flower': 'פרח',
    'leaf':   'עלה',
}

DAY_TYPE_EMOJI = {
    'fruit':  '🍅',
    'root':   '🥕',
    'flower': '🌸',
    'leaf':   '🌿',
}

# ═══════════════════════════════════════════════════════
# ASTRONOMICAL CALCULATIONS
# ═══════════════════════════════════════════════════════

def date_to_jd(year: int, month: int, day: int, hour: float = 12.0) -> float:
    """Convert date to Julian Day Number."""
    return swe.julday(year, month, day, hour)

def get_moon_position(jd: float) -> dict:
    """Get moon's sidereal position using Fagan/Bradley ayanamsa."""
    swe.set_sid_mode(AYANAMSA)

    # Calculate moon position (sidereal)
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    result, ret = swe.calc_ut(jd, swe.MOON, flags)

    lon = result[0]  # sidereal longitude 0-360
    lat = result[1]  # ecliptic latitude
    speed = result[3]  # speed in longitude

    sign_index = int(lon / 30)
    sign_degree = lon % 30

    return {
        'longitude': lon,
        'latitude': lat,
        'speed': speed,
        'sign_index': sign_index,
        'sign_degree': sign_degree,
        'sign_he': SIGN_NAMES_HE[sign_index],
        'sign_en': SIGN_NAMES_EN[sign_index],
        'element': SIGN_ELEMENT[sign_index],
        'day_type': ELEMENT_TO_DAY_TYPE[SIGN_ELEMENT[sign_index]],
    }

def get_moon_phase(jd: float) -> dict:
    """Get moon phase (0-360 degrees from new moon)."""
    # Sun position
    sun_result, _ = swe.calc_ut(jd, swe.SUN, swe.FLG_SIDEREAL)
    # Moon position
    moon_result, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SIDEREAL)

    phase_angle = (moon_result[0] - sun_result[0]) % 360

    if phase_angle < 45:
        phase_name = 'new_moon'
        phase_he = 'ירח חדש'
    elif phase_angle < 90:
        phase_name = 'waxing_crescent'
        phase_he = 'סהר גדל'
    elif phase_angle < 135:
        phase_name = 'first_quarter'
        phase_he = 'רבע ראשון'
    elif phase_angle < 180:
        phase_name = 'waxing_gibbous'
        phase_he = 'כמעט מלא'
    elif phase_angle < 225:
        phase_name = 'full_moon'
        phase_he = 'ירח מלא'
    elif phase_angle < 270:
        phase_name = 'waning_gibbous'
        phase_he = 'מתמעט'
    elif phase_angle < 315:
        phase_name = 'last_quarter'
        phase_he = 'רבע אחרון'
    else:
        phase_name = 'waning_crescent'
        phase_he = 'סהר פוחת'

    return {
        'angle': phase_angle,
        'name': phase_name,
        'name_he': phase_he,
        'is_new_moon': phase_angle < 20 or phase_angle > 340,
        'is_full_moon': 160 < phase_angle < 200,
    }

def get_moon_declination(jd: float) -> dict:
    """
    Get moon declination to determine ascending/descending.
    Maria Thun: Moon ascending = moving toward highest point (summer)
    Moon descending = moving toward lowest point (winter)
    This is about DECLINATION, not latitude.
    """
    flags = swe.FLG_EQUATORIAL | swe.FLG_SPEED

    result, _ = swe.calc_ut(jd, swe.MOON, flags)
    declination = result[1]  # declination in equatorial coords
    dec_speed = result[4]    # speed of declination

    # Ascending = declination increasing (moving north)
    # Descending = declination decreasing (moving south)
    is_ascending = dec_speed > 0

    return {
        'declination': declination,
        'speed': dec_speed,
        'ascending': is_ascending,
        'direction': 'ascending' if is_ascending else 'descending',
        'direction_he': 'עולה' if is_ascending else 'יורד',
    }

def check_node_proximity(jd: float) -> dict:
    """
    Check if moon is near lunar nodes (node days).
    Maria Thun: 12 hours before and after node = avoid gardening.
    Stella Natura: extends to 6 hours each side.
    We use Maria Thun: 12 hours each side.
    """
    # Get true lunar node position
    node_result, _ = swe.calc_ut(jd, swe.TRUE_NODE, swe.FLG_SPEED)
    south_node = (node_result[0] + 180) % 360

    moon_result, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SPEED)
    moon_lon = moon_result[0]

    # Distance to north node
    dist_north = min(
        abs(moon_lon - node_result[0]),
        360 - abs(moon_lon - node_result[0])
    )
    # Distance to south node
    dist_south = min(
        abs(moon_lon - south_node),
        360 - abs(moon_lon - south_node)
    )

    min_dist = min(dist_north, dist_south)

    # Moon moves ~13 deg/day, so 12 hours = ~6.5 degrees
    NODE_ORB = 6.5  # degrees (Maria Thun: 12 hours each side)

    is_node = min_dist < NODE_ORB

    return {
        'node_longitude': node_result[0],
        'moon_to_node_degrees': min_dist,
        'is_node_day': is_node,
        'node_type': 'north' if dist_north < dist_south else 'south',
    }

def check_perigee_apogee(jd: float) -> dict:
    """Check if moon is near perigee (closest) or apogee (farthest)."""
    result, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SPEED | swe.FLG_DISTANCE)
    distance = result[2]  # AU
    dist_speed = result[5]  # speed of distance

    # Perigee range: ~0.00220 - 0.00240 AU
    # Apogee range: ~0.00265 - 0.00272 AU
    is_perigee = distance < 0.00242  # within ~5% of closest approach
    is_apogee = distance > 0.00265   # near farthest point

    return {
        'distance_au': distance,
        'distance_speed': dist_speed,
        'is_perigee': is_perigee,
        'is_apogee': is_apogee,
    }

# ═══════════════════════════════════════════════════════
# PLANTING SCORE ALGORITHM
# Combines Maria Thun + Stella Natura + Astronomical
# ═══════════════════════════════════════════════════════

def calculate_planting_score(
    day_type: str,
    ascending: bool,
    is_node: bool,
    is_perigee: bool,
    is_full_moon: bool,
    is_new_moon: bool,
    moon_phase_angle: float,
) -> tuple:
    """
    Calculate biodynamic planting score (1-10) and colour.

    Maria Thun rules:
    - Node days: avoid all gardening (score 2)
    - Descending moon: best for planting/transplanting
    - Ascending moon: best for harvesting/pruning

    Stella Natura additions:
    - Full moon: increased vitality, good for planting
    - New moon: rest period, avoid major work
    - Perigee: can cause overshooting/bolting
    """
    if is_node:
        return 2, 'black'

    score = 5  # base score

    # Descending moon bonus (Maria Thun: best for planting)
    if not ascending:
        score += 2

    # Moon phase adjustments (Stella Natura)
    if is_full_moon:
        score += 1  # increased vitality
    elif is_new_moon:
        score -= 1  # rest period

    # Perigee penalty (Stella Natura: can cause bolting)
    if is_perigee:
        score -= 1

    # Waxing phase (first quarter) slight bonus
    if 45 < moon_phase_angle < 135:
        score += 1

    # Clamp to 1-10
    score = max(1, min(10, score))

    # Colour coding
    if score >= 8:
        colour = 'green'
    elif score >= 6:
        colour = 'yellow'
    elif score >= 4:
        colour = 'orange'
    elif score >= 2:
        colour = 'red'
    else:
        colour = 'black'

    return score, colour

def is_prep500_recommended(ascending: bool, is_node: bool) -> bool:
    """
    BD 500 (horn manure): Apply in descending moon, afternoon.
    Best: descending moon, afternoon (15:00-19:00)
    """
    return not ascending and not is_node

def is_prep501_recommended(ascending: bool, is_node: bool) -> bool:
    """
    BD 501 (horn silica): Apply in ascending moon, early morning.
    Best: ascending moon, sunrise to 9:00
    """
    return ascending and not is_node

# ═══════════════════════════════════════════════════════
# MOOSH DAILY SUMMARY GENERATOR
# ═══════════════════════════════════════════════════════

MOOSH_SUMMARIES = {
    ('fruit', True, False): [
        'יום פרי עם ירח עולה — קטוף פירות וירקות פרי לטעם מיטבי',
        'ירח עולה ביום פרי — האנרגיה עולה לעלים ולפירות',
        'יום מצוין לקטיף פירות וירקות פרי',
    ],
    ('fruit', False, False): [
        'יום פרי עם ירח יורד — זמן מצוין לשתילת עגבניות, פלפלים ומלפפונים',
        'ירח יורד ביום פרי — האנרגיה יורדת לשורשים, שתול צמחי פרי',
        'הזמן האידיאלי לשתילת ירקות פרי',
    ],
    ('root', True, False): [
        'יום שורש עם ירח עולה — קטוף ירקות שורש לאחסון',
        'ירח עולה ביום שורש — קצור גזר, סלק ובצל היום',
    ],
    ('root', False, False): [
        'יום שורש עם ירח יורד — שתול גזר, סלק, לפת ובצל',
        'ירח יורד ביום שורש — האדמה קולטת שורשים חדשים',
        'הזמן הטוב ביותר לשתילת ירקות שורש',
    ],
    ('flower', True, False): [
        'יום פרח עם ירח עולה — קטוף פרחים ועשבי תיבול לייבוש',
        'ירח עולה ביום פרח — כוח הפריחה בשיאו',
    ],
    ('flower', False, False): [
        'יום פרח עם ירח יורד — שתול פרחים ועשבי תיבול',
        'ירח יורד ביום פרח — שתול צמחי תבלין ופרחים',
    ],
    ('leaf', True, False): [
        'יום עלה עם ירח עולה — גזום וקצור ירקות עלים',
        'ירח עולה ביום עלה — הירוק בשיאו, קצור חסה ותרד',
    ],
    ('leaf', False, False): [
        'יום עלה עם ירח יורד — שתול חסה, תרד וירקות עלים',
        'ירח יורד ביום עלה — שתול ירקות עלים וכרוב',
    ],
}

import random

def get_moosh_summary(
    day_type: str,
    ascending: bool,
    is_node: bool,
    prep500: bool,
    prep501: bool,
) -> str:
    if is_node:
        return 'יום צומת — מוש ממליץ לנוח ולא לעבוד בגינה היום'

    key = (day_type, ascending, False)
    options = MOOSH_SUMMARIES.get(key, [f'יום {DAY_TYPE_HE.get(day_type, "")} — עבוד בגינה בהתאם לסוג היום'])

    summary = random.choice(options)

    if prep500:
        summary += '. מומלץ למרוח פרפרט 500 אחה״צ'
    if prep501:
        summary += '. מומלץ למרוח פרפרט 501 בבוקר'

    return summary

# ═══════════════════════════════════════════════════════
# MAIN GENERATION LOOP
# ═══════════════════════════════════════════════════════

def generate_calendar_data(start_date: datetime, days: int) -> list:
    """Generate biodynamic calendar data for given period."""
    calendar_rows = []

    for day_offset in range(days):
        current_date = start_date + timedelta(days=day_offset)
        date_str = current_date.strftime('%Y-%m-%d')

        # Use noon Israel time for calculations
        year = current_date.year
        month = current_date.month
        day = current_date.day
        hour_utc = 12.0 - ISRAEL_TZ_OFFSET  # noon Israel = 10:00 UTC

        jd = date_to_jd(year, month, day, hour_utc)

        # Calculate all astronomical data
        moon_pos = get_moon_position(jd)
        moon_phase = get_moon_phase(jd)
        moon_decl = get_moon_declination(jd)
        node_data = check_node_proximity(jd)
        perigee_data = check_perigee_apogee(jd)

        # Calculate score
        score, colour = calculate_planting_score(
            day_type=moon_pos['day_type'],
            ascending=moon_decl['ascending'],
            is_node=node_data['is_node_day'],
            is_perigee=perigee_data['is_perigee'],
            is_full_moon=moon_phase['is_full_moon'],
            is_new_moon=moon_phase['is_new_moon'],
            moon_phase_angle=moon_phase['angle'],
        )

        prep500 = is_prep500_recommended(moon_decl['ascending'], node_data['is_node_day'])
        prep501 = is_prep501_recommended(moon_decl['ascending'], node_data['is_node_day'])

        moosh_summary = get_moosh_summary(
            moon_pos['day_type'],
            moon_decl['ascending'],
            node_data['is_node_day'],
            prep500,
            prep501,
        )

        row = {
            'date': date_str,
            'day_type': moon_pos['day_type'],
            'day_type_he': DAY_TYPE_HE[moon_pos['day_type']],
            'day_type_emoji': DAY_TYPE_EMOJI[moon_pos['day_type']],
            'moon_sign': moon_pos['sign_en'],
            'moon_sign_he': moon_pos['sign_he'],
            'moon_longitude': round(moon_pos['longitude'], 4),
            'moon_sign_degree': round(moon_pos['sign_degree'], 2),
            'ascending_descending': moon_decl['direction'],
            'moon_declination': round(moon_decl['declination'], 4),
            'node_active': node_data['is_node_day'],
            'node_degrees_distance': round(node_data['moon_to_node_degrees'], 2),
            'moon_phase': moon_phase['name'],
            'moon_phase_he': moon_phase['name_he'],
            'moon_phase_angle': round(moon_phase['angle'], 2),
            'perigee_active': perigee_data['is_perigee'],
            'planting_score': score,
            'score_colour': colour,
            'prep_500_recommended': prep500,
            'prep_501_recommended': prep501,
            'moosh_daily_summary': moosh_summary,
        }
        calendar_rows.append(row)

        if day_offset % 30 == 0:
            print(f'Generated {day_offset}/{days} days... ({date_str})')

    return calendar_rows

def upsert_to_supabase(rows: list) -> bool:
    """Upsert calendar rows to Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set')
        return False

    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }

    # Upsert in batches of 50
    batch_size = 50
    total = len(rows)

    for i in range(0, total, batch_size):
        batch = rows[i:i+batch_size]
        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/biodynamic_calendar',
            headers=headers,
            json=batch,
        )
        if response.status_code not in (200, 201):
            print(f'ERROR upserting batch {i//batch_size}: {response.text}')
            return False
        print(f'Upserted {min(i+batch_size, total)}/{total} rows')

    return True

def main():
    print('🌕 Gina Haya — Real Biodynamic Calendar Generator')
    print('=' * 50)

    # Default: start from today
    if len(sys.argv) > 1:
        start_date = datetime.strptime(sys.argv[1], '%Y-%m-%d')
    else:
        start_date = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0,
            tzinfo=None
        )

    days = int(sys.argv[2]) if len(sys.argv) > 2 else DAYS_TO_GENERATE

    print(f'Generating {days} days from {start_date.strftime("%Y-%m-%d")}')
    print(f'Using: pyswisseph {swe.__version__}')
    print(f'Ayanamsa: Fagan/Bradley (Maria Thun standard)')
    print()

    # Generate data
    rows = generate_calendar_data(start_date, days)

    print(f'\nGenerated {len(rows)} calendar rows')

    # Print sample
    sample = rows[0]
    print(f'\nSample (day 1 — {sample["date"]}):')
    print(f'  Day type: {sample["day_type_he"]} {sample["day_type_emoji"]}')
    print(f'  Moon sign: {sample["moon_sign_he"]} ({sample["moon_sign_degree"]:.1f}°)')
    print(f'  Direction: {sample["ascending_descending"]}')
    print(f'  Node day: {sample["node_active"]}')
    print(f'  Phase: {sample["moon_phase_he"]}')
    print(f'  Score: {sample["planting_score"]}/10 ({sample["score_colour"]})')
    print(f'  BD 500: {sample["prep_500_recommended"]}')
    print(f'  Moosh: {sample["moosh_daily_summary"]}')

    # Upsert to Supabase
    print(f'\nUpserting to Supabase...')
    success = upsert_to_supabase(rows)

    if success:
        print(f'\n✅ Successfully generated and stored {len(rows)} real biodynamic calendar days!')
    else:
        # Save to JSON as fallback
        with open('calendar_output.json', 'w', encoding='utf-8') as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        print(f'\n⚠️  Saved to calendar_output.json (Supabase upsert failed)')

if __name__ == '__main__':
    main()
