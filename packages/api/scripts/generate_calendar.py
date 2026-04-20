#!/usr/bin/env python3
"""
Gina Haya — Real Biodynamic Calendar Generator
Combines: Maria Thun + Stella Natura + Rudolf Steiner (BDI) + Pure Sidereal Zodiac
Uses: pyswisseph for astronomical calculations

Sources:
- Maria Thun Biodynamic Calendar
- Stella Natura Biodynamic Planting Calendar  
- Bio-Dynamic Association of India (BDI) / Rudolf Steiner principles
- Pure sidereal zodiac (Fagan/Bradley ayanamsa)
"""

import swisseph as swe
import json
import os
import sys
import math
import random
from datetime import datetime, timedelta, timezone
import requests

# ═══════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')
ISRAEL_TZ_OFFSET = 2  # UTC+2 standard (UTC+3 DST — handled separately)
DAYS_TO_GENERATE = 400

EPH_PATH = os.environ.get('SE_EPHE_PATH', '')
if EPH_PATH:
    swe.set_ephe_path(EPH_PATH)

# ═══════════════════════════════════════════════════════
# SIDEREAL ZODIAC — FAGAN/BRADLEY (Maria Thun standard)
# ═══════════════════════════════════════════════════════

AYANAMSA = swe.SIDM_FAGAN_BRADLEY

SIGN_NAMES_HE = [
    'טלה', 'שור', 'תאומים', 'סרטן', 'אריה', 'בתולה',
    'מאזניים', 'עקרב', 'קשת', 'גדי', 'דלי', 'דגים'
]
SIGN_NAMES_EN = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
]

# Element mapping (BDI / Maria Thun / Stella Natura — all agree)
# Fire=Fruit, Earth=Root, Air=Flower, Water=Leaf
SIGN_ELEMENT = {
    0: 'fire',   # Aries
    1: 'earth',  # Taurus
    2: 'air',    # Gemini
    3: 'water',  # Cancer
    4: 'fire',   # Leo
    5: 'earth',  # Virgo
    6: 'air',    # Libra
    7: 'water',  # Scorpio
    8: 'fire',   # Sagittarius
    9: 'earth',  # Capricorn
    10: 'air',   # Aquarius
    11: 'water', # Pisces
}

ELEMENT_TO_DAY_TYPE = {
    'fire': 'fruit', 'earth': 'root', 'air': 'flower', 'water': 'leaf'
}

DAY_TYPE_HE    = {'fruit': 'פרי', 'root': 'שורש', 'flower': 'פרח', 'leaf': 'עלה'}
DAY_TYPE_EMOJI = {'fruit': '🍅', 'root': '🥕', 'flower': '🌸', 'leaf': '🌿'}

# ═══════════════════════════════════════════════════════
# ASTRONOMICAL CALCULATIONS
# ═══════════════════════════════════════════════════════

def date_to_jd(year, month, day, hour=10.0):
    """Convert date to Julian Day. hour=10 UTC = noon Israel standard time."""
    return swe.julday(year, month, day, hour)

def get_moon_position(jd):
    swe.set_sid_mode(AYANAMSA)
    flags = swe.FLG_SIDEREAL | swe.FLG_SPEED
    result, _ = swe.calc_ut(jd, swe.MOON, flags)
    lon = result[0]
    sign_index = int(lon / 30)
    return {
        'longitude': lon,
        'latitude': result[1],
        'speed': result[3],
        'sign_index': sign_index,
        'sign_degree': lon % 30,
        'sign_he': SIGN_NAMES_HE[sign_index],
        'sign_en': SIGN_NAMES_EN[sign_index],
        'element': SIGN_ELEMENT[sign_index],
        'day_type': ELEMENT_TO_DAY_TYPE[SIGN_ELEMENT[sign_index]],
    }

def get_moon_phase(jd):
    swe.set_sid_mode(AYANAMSA)
    sun, _  = swe.calc_ut(jd, swe.SUN,  swe.FLG_SIDEREAL)
    moon, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SIDEREAL)
    angle = (moon[0] - sun[0]) % 360

    if angle < 20 or angle > 340:    name, name_he = 'new_moon',       'ירח חדש'
    elif angle < 90:                  name, name_he = 'waxing_crescent', 'סהר גדל'
    elif angle < 100:                 name, name_he = 'first_quarter',   'רבע ראשון'
    elif angle < 180:                 name, name_he = 'waxing_gibbous',  'כמעט מלא'
    elif angle < 200:                 name, name_he = 'full_moon',       'ירח מלא'
    elif angle < 270:                 name, name_he = 'waning_gibbous',  'מתמעט'
    elif angle < 280:                 name, name_he = 'last_quarter',    'רבע אחרון'
    else:                             name, name_he = 'waning_crescent', 'סהר פוחת'

    return {
        'angle': angle,
        'name': name,
        'name_he': name_he,
        'is_new_moon': angle < 20 or angle > 340,
        'is_full_moon': 160 < angle < 200,
        # BDI: 48 hours BEFORE full moon is best sowing window
        'is_pre_full_moon': 110 < angle < 160,
    }

def get_moon_declination(jd):
    """
    Ascending/descending based on declination (Maria Thun method).
    Ascending = moon moving toward highest declination (north).
    Descending = moon moving toward lowest declination (south).
    """
    flags = swe.FLG_EQUATORIAL | swe.FLG_SPEED
    result, _ = swe.calc_ut(jd, swe.MOON, flags)
    dec_speed = result[4]
    is_ascending = dec_speed > 0
    return {
        'declination': result[1],
        'speed': dec_speed,
        'ascending': is_ascending,
        'direction': 'ascending' if is_ascending else 'descending',
        'direction_he': 'עולה' if is_ascending else 'יורד',
    }

def check_node_proximity(jd):
    """
    BDI: 6 hours before AND after node = avoid farming.
    Maria Thun: 12 hours each side.
    We use BDI (6 hours) = ~3.25 degrees orb.
    """
    node, _ = swe.calc_ut(jd, swe.TRUE_NODE, swe.FLG_SPEED)
    moon, _ = swe.calc_ut(jd, swe.MOON,      swe.FLG_SPEED)
    south_node = (node[0] + 180) % 360
    moon_lon   = moon[0]

    dist_n = min(abs(moon_lon - node[0]),      360 - abs(moon_lon - node[0]))
    dist_s = min(abs(moon_lon - south_node),   360 - abs(moon_lon - south_node))
    min_dist = min(dist_n, dist_s)

    NODE_ORB = 3.25  # degrees ≈ 6 hours (BDI standard)

    return {
        'node_longitude': node[0],
        'moon_to_node_degrees': min_dist,
        'is_node_day': min_dist < NODE_ORB,
        'node_type': 'north' if dist_n < dist_s else 'south',
    }

def check_perigee_apogee(jd):
    """
    BDI: Avoid sowing/transplanting 6 hours around perigee AND apogee.
    Exception: apogee is good for bulbs (potatoes etc).
    """
    result, _ = swe.calc_ut(jd, swe.MOON, swe.FLG_SPEED)
    distance   = result[2]   # AU — always returned even without FLG_DISTANCE
    dist_speed = result[3]   # speed in longitude (proxy for distance change)

    is_perigee = distance < 0.00242
    is_apogee  = distance > 0.00265

    return {
        'distance_au': distance,
        'distance_speed': dist_speed,
        'is_perigee': is_perigee,
        'is_apogee':  is_apogee,
    }

def check_moon_opposite_saturn(jd):
    """
    BDI: Moon opposite Saturn (180°) = auspicious for all farming.
    Occurs every ~27.5 days. Use 10° orb.
    """
    moon, _   = swe.calc_ut(jd, swe.MOON,   swe.FLG_SIDEREAL)
    saturn, _ = swe.calc_ut(jd, swe.SATURN, swe.FLG_SIDEREAL)

    angle_diff = abs(moon[0] - saturn[0])
    if angle_diff > 180:
        angle_diff = 360 - angle_diff

    orb = 10  # degrees
    is_opposite = abs(angle_diff - 180) < orb

    return {
        'moon_saturn_angle': angle_diff,
        'moon_opposite_saturn': is_opposite,
        'saturn_longitude': saturn[0],
    }

# ═══════════════════════════════════════════════════════
# PLANTING SCORE — Combined Maria Thun + BDI + Stella Natura
# ═══════════════════════════════════════════════════════

def calculate_planting_score(
    ascending, is_node, is_perigee, is_apogee,
    is_full_moon, is_new_moon, is_pre_full_moon,
    moon_opposite_saturn, phase_angle,
):
    """
    Score 1-10 combining all three systems.

    BDI rules:
    - Node day: avoid (score 2)
    - Ascending: sowing seeds, foliar spray, harvesting
    - Descending: transplanting, compost, soil work
    - Moon opposite Saturn: auspicious (+2)
    - 48h before full moon: good sowing (+1)
    - New moon: avoid sowing (-2)
    - Perigee/Apogee: avoid sowing (-1)

    Maria Thun:
    - Descending best for planting (+2)

    Stella Natura:
    - Full moon: increased vitality (+1)
    - Waxing phase: slight bonus (+1)
    """
    if is_node:
        return 2, 'black'

    score = 5  # base

    # Descending moon = best for planting (Maria Thun + BDI)
    if not ascending:
        score += 2
    else:
        score += 1  # ascending still good for sowing seeds (BDI)

    # Moon opposite Saturn = auspicious (BDI unique rule)
    if moon_opposite_saturn:
        score += 2

    # 48h before full moon = good sowing window (BDI)
    if is_pre_full_moon:
        score += 1

    # Full moon = increased vitality (Stella Natura)
    if is_full_moon:
        score += 1

    # New moon = rest, avoid sowing (BDI)
    if is_new_moon:
        score -= 2

    # Perigee = bolting risk, avoid (BDI + Stella Natura)
    if is_perigee:
        score -= 1

    # Apogee = avoid regular sowing but ok for bulbs (BDI)
    if is_apogee:
        score -= 1

    # Waxing phase slight bonus (Stella Natura)
    if 45 < phase_angle < 135:
        score += 1

    score = max(1, min(10, score))

    if score >= 8:    colour = 'green'
    elif score >= 6:  colour = 'yellow'
    elif score >= 4:  colour = 'orange'
    elif score >= 2:  colour = 'red'
    else:             colour = 'black'

    return score, colour

# ═══════════════════════════════════════════════════════
# BD PREPARATION RECOMMENDATIONS
# ═══════════════════════════════════════════════════════

def prep_recommendations(ascending, is_node, is_full_moon,
                          is_pre_full_moon, moon_opposite_saturn):
    """
    BD-500 (Horn Manure): Descending moon, afternoon soil application.
    BD-501 (Horn Silica): Ascending moon, early morning foliar spray.
                          Also: full moon and moon-opposite-saturn days (BDI).
    CPP (Cow Pat Pit):    Descending moon, soil application (BDI).
    Returns raw astronomical conditions only — cooldown is applied separately.
    """
    prep500 = not ascending and not is_node
    prep501 = (ascending or is_full_moon or moon_opposite_saturn) and not is_node
    cpp     = not ascending and not is_node

    return prep500, prep501, cpp


def apply_prep_cooldowns(raw_500, raw_501, raw_cpp, current_date,
                         last_500, last_501, last_cpp,
                         season_500_counts, month_501_counts):
    """
    Enforce biodynamic prep spacing rules:
      פרפרט 500: min 28 days between windows, max 2 per 3-month season.
      פרפרט 501: min 14 days between windows, max 1 per calendar month.
                 Also: 7-day buffer after any 500 window.
      CPP:       min 21 days between windows.
      500 and 501 must never fall on the same day.
    Returns (prep500, prep501, cpp).
    """
    season_key = (current_date.year, (current_date.month - 1) // 3)
    month_key  = (current_date.year, current_date.month)

    # פרפרט 500
    prep500 = (
        raw_500
        and (last_500 is None or (current_date - last_500).days >= 28)
        and season_500_counts.get(season_key, 0) < 2
    )

    # פרפרט 501 (also blocked for 7 days after a 500 window)
    prep501 = (
        raw_501
        and not prep500
        and (last_501 is None or (current_date - last_501).days >= 14)
        and month_501_counts.get(month_key, 0) < 1
        and (last_500 is None or (current_date - last_500).days >= 7)
    )

    # CPP
    cpp = (
        raw_cpp
        and (last_cpp is None or (current_date - last_cpp).days >= 21)
    )

    return prep500, prep501, cpp

# ═══════════════════════════════════════════════════════
# MOOSH DAILY SUMMARIES — Hebrew, wise, warm
# ═══════════════════════════════════════════════════════

def get_mon_summary(day_type, ascending, is_node, is_full_moon,
                      is_new_moon, is_pre_full_moon, moon_opposite_saturn,
                      is_perigee, is_apogee, prep500, prep501):
    if is_node:
        return 'יום צומת — מון ממליץ לנוח מעבודת הגינה היום ולתת לאדמה לנשום'

    parts = []

    # Moon opposite Saturn — BDI special day
    if moon_opposite_saturn:
        parts.append('הירח מול שבתאי — יום מבורך לכל עבודות הגינה לפי המסורת הביודינמית')

    # Phase messages
    if is_full_moon:
        parts.append('ירח מלא — אנרגיה מוגברת, הצמחים בשיא חיוניותם')
    elif is_new_moon:
        parts.append('ירח חדש — זמן מנוחה, הימנע מזריעה ושתילה היום')
    elif is_pre_full_moon:
        parts.append('48 שעות לפני ירח מלא — חלון זריעה מצוין לפי הקלנדר הביודינמי')

    # Perigee/Apogee
    if is_perigee:
        parts.append('הירח בנקודת הקרבה — הימנע מזריעה ושתילה, סכנת בליטה מוגזמת')
    elif is_apogee:
        parts.append('הירח בנקודת הרחוק — מתאים לשתילת פקעות כגון תפוחי אדמה')

    # Day type + direction
    direction_he = 'עולה' if ascending else 'יורד'
    dt_he = DAY_TYPE_HE.get(day_type, '')

    if day_type == 'fruit':
        if not ascending:
            parts.append(f'יום פרי עם ירח {direction_he} — הזמן האידיאלי לשתילת עגבניות, פלפלים ומלפפונים')
        else:
            parts.append(f'יום פרי עם ירח {direction_he} — מצוין לקטיף פירות וירקות פרי לטעם מיטבי')
    elif day_type == 'root':
        if not ascending:
            parts.append(f'יום שורש עם ירח {direction_he} — שתול גזר, סלק, לפת ובצל היום')
        else:
            parts.append(f'יום שורש עם ירח {direction_he} — קטוף ירקות שורש ואחסן')
    elif day_type == 'flower':
        if not ascending:
            parts.append(f'יום פרח עם ירח {direction_he} — שתול פרחים ועשבי תיבול')
        else:
            parts.append(f'יום פרח עם ירח {direction_he} — קטוף פרחים לייבוש ועשבי תיבול')
    elif day_type == 'leaf':
        if not ascending:
            parts.append(f'יום עלה עם ירח {direction_he} — שתול חסה, תרד וירקות עלים')
        else:
            parts.append(f'יום עלה עם ירח {direction_he} — גזום וקטוף ירקות עלים בשיא טריותם')

    # Prep recommendations
    if prep500 and prep501:
        parts.append('מומלץ: פרפרט 500 אחה"צ על הקרקע, פרפרט 501 בזריחה על העלווה')
    elif prep500:
        parts.append('מומלץ למרוח פרפרט 500 על הקרקע אחה"צ (16:00-19:00)')
    elif prep501:
        parts.append('מומלץ למרוח פרפרט 501 בבוקר על העלווה (עד 09:00)')

    return '. '.join(parts) if parts else f'יום {dt_he} — עבוד בגינה בהתאם לאנרגיית הירח'

# ═══════════════════════════════════════════════════════
# MAIN GENERATION LOOP
# ═══════════════════════════════════════════════════════

def is_israel_dst(dt):
    """Israel DST: last Friday before April 2 until last Sunday before Yom Kippur (approx Oct)."""
    if dt.month > 10 or dt.month < 3:
        return False
    if dt.month == 3:
        # Last Friday before April 2
        apr2 = datetime(dt.year, 4, 2)
        days_back = (apr2.weekday() - 4) % 7  # Friday=4
        dst_start = apr2 - timedelta(days=days_back)
        return dt >= dst_start
    if dt.month < 10:
        return True
    # October: until last Sunday before Yom Kippur (~Oct 10)
    return dt.day < 8

def generate_calendar_data(start_date, days):
    rows = []

    # Cooldown state
    last_500 = None   # date of last prep_500_recommended = True
    last_501 = None   # date of last prep_501_recommended = True
    last_cpp = None   # date of last cpp_recommended = True
    season_500_counts = {}  # (year, quarter) -> count; max 2/season
    month_501_counts  = {}  # (year, month) -> count; max 1/month

    # Scheduling summary
    scheduled_500 = []
    scheduled_501 = []
    scheduled_cpp = []

    for offset in range(days):
        dt = start_date + timedelta(days=offset)
        date_str = dt.strftime('%Y-%m-%d')
        current_date = dt.date()

        tz_offset = 3 if is_israel_dst(dt) else 2
        hour_utc = 12.0 - tz_offset  # noon Israel time in UTC

        jd = date_to_jd(dt.year, dt.month, dt.day, hour_utc)

        moon_pos    = get_moon_position(jd)
        moon_phase  = get_moon_phase(jd)
        moon_decl   = get_moon_declination(jd)
        node_data   = check_node_proximity(jd)
        perigee_data= check_perigee_apogee(jd)
        saturn_data = check_moon_opposite_saturn(jd)

        score, colour = calculate_planting_score(
            ascending            = moon_decl['ascending'],
            is_node              = node_data['is_node_day'],
            is_perigee           = perigee_data['is_perigee'],
            is_apogee            = perigee_data['is_apogee'],
            is_full_moon         = moon_phase['is_full_moon'],
            is_new_moon          = moon_phase['is_new_moon'],
            is_pre_full_moon     = moon_phase['is_pre_full_moon'],
            moon_opposite_saturn = saturn_data['moon_opposite_saturn'],
            phase_angle          = moon_phase['angle'],
        )

        raw_500, raw_501, raw_cpp = prep_recommendations(
            ascending            = moon_decl['ascending'],
            is_node              = node_data['is_node_day'],
            is_full_moon         = moon_phase['is_full_moon'],
            is_pre_full_moon     = moon_phase['is_pre_full_moon'],
            moon_opposite_saturn = saturn_data['moon_opposite_saturn'],
        )

        prep500, prep501, cpp = apply_prep_cooldowns(
            raw_500, raw_501, raw_cpp, current_date,
            last_500, last_501, last_cpp,
            season_500_counts, month_501_counts,
        )

        # Update cooldown state after approval
        if prep500:
            last_500 = current_date
            season_key = (dt.year, (dt.month - 1) // 3)
            season_500_counts[season_key] = season_500_counts.get(season_key, 0) + 1
            scheduled_500.append(date_str)
        if prep501:
            last_501 = current_date
            month_key = (dt.year, dt.month)
            month_501_counts[month_key] = month_501_counts.get(month_key, 0) + 1
            scheduled_501.append(date_str)
        if cpp:
            last_cpp = current_date
            scheduled_cpp.append(date_str)

        mon = get_mon_summary(
            day_type             = moon_pos['day_type'],
            ascending            = moon_decl['ascending'],
            is_node              = node_data['is_node_day'],
            is_full_moon         = moon_phase['is_full_moon'],
            is_new_moon          = moon_phase['is_new_moon'],
            is_pre_full_moon     = moon_phase['is_pre_full_moon'],
            moon_opposite_saturn = saturn_data['moon_opposite_saturn'],
            is_perigee           = perigee_data['is_perigee'],
            is_apogee            = perigee_data['is_apogee'],
            prep500              = prep500,
            prep501              = prep501,
        )

        rows.append({
            'date':                    date_str,
            'day_type':                moon_pos['day_type'],
            'day_type_he':             DAY_TYPE_HE[moon_pos['day_type']],
            'day_type_emoji':          DAY_TYPE_EMOJI[moon_pos['day_type']],
            'moon_sign':               moon_pos['sign_en'],
            'moon_sign_he':            moon_pos['sign_he'],
            'moon_longitude':          round(moon_pos['longitude'], 4),
            'moon_sign_degree':        round(moon_pos['sign_degree'], 2),
            'ascending_descending':    moon_decl['direction'],
            'ascending_descending_he': moon_decl['direction_he'],
            'moon_declination':        round(moon_decl['declination'], 4),
            'node_active':             node_data['is_node_day'],
            'node_degrees_distance':   round(node_data['moon_to_node_degrees'], 2),
            'moon_phase':              moon_phase['name'],
            'moon_phase_he':           moon_phase['name_he'],
            'moon_phase_pct':          round((1 - math.cos(math.radians(moon_phase['angle']))) / 2 * 100),
            'moon_phase_name':         moon_phase['name'],
            'moon_phase_name_he':      moon_phase['name_he'],
            'moon_phase_angle':        round(moon_phase['angle'], 2),
            'perigee_active':          perigee_data['is_perigee'],
            'apogee_active':           perigee_data['is_apogee'],
            'moon_opposite_saturn':    saturn_data['moon_opposite_saturn'],
            'planting_score':          score,
            'score_colour':            colour,
            'prep_500_recommended':    prep500,
            'prep_501_recommended':    prep501,
            'cpp_recommended':         cpp,
            'mon_daily_summary':     mon,
        })

        if offset % 30 == 0:
            print(f'  {offset}/{days} days ({date_str}) — {moon_pos["sign_he"]} {DAY_TYPE_HE[moon_pos["day_type"]]} score={score}')

    return rows, scheduled_500, scheduled_501, scheduled_cpp

def generate_cleanup_sql():
    """
    Returns SQL that removes duplicate garden_tasks prep rows that fall within
    the cooldown window of an earlier row with the same prep title.
    Keeps the earliest occurrence per cooldown window.
    """
    return """-- BD Prep cooldown cleanup: remove duplicate garden_tasks
-- Run this once to clean up tasks seeded before cooldown logic was applied.

-- פרפרט 500: keep earliest, delete rows within 28 days of a prior row
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t2.id
  FROM garden_tasks t1
  JOIN garden_tasks t2
    ON t1.user_id = t2.user_id
   AND t1.title LIKE '%פרפרט 500%'
   AND t2.title LIKE '%פרפרט 500%'
   AND t2.date > t1.date
   AND (t2.date::date - t1.date::date) < 28
   AND t2.id <> t1.id
);

-- פרפרט 501: keep earliest, delete rows within 14 days of a prior row
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t2.id
  FROM garden_tasks t1
  JOIN garden_tasks t2
    ON t1.user_id = t2.user_id
   AND t1.title LIKE '%פרפרט 501%'
   AND t2.title LIKE '%פרפרט 501%'
   AND t2.date > t1.date
   AND (t2.date::date - t1.date::date) < 14
   AND t2.id <> t1.id
);

-- CPP: keep earliest, delete rows within 21 days of a prior row
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t2.id
  FROM garden_tasks t1
  JOIN garden_tasks t2
    ON t1.user_id = t2.user_id
   AND (t1.title ILIKE '%cpp%' OR t1.title ILIKE '%cow pat%')
   AND (t2.title ILIKE '%cpp%' OR t2.title ILIKE '%cow pat%')
   AND t2.date > t1.date
   AND (t2.date::date - t1.date::date) < 21
   AND t2.id <> t1.id
);

-- Remove 500 and 501 tasks that fall on the same date (keep 500, drop 501)
DELETE FROM garden_tasks
WHERE id IN (
  SELECT t501.id
  FROM garden_tasks t500
  JOIN garden_tasks t501
    ON t500.user_id = t501.user_id
   AND t500.date = t501.date
   AND t500.title LIKE '%פרפרט 500%'
   AND t501.title LIKE '%פרפרט 501%'
);
"""


def upsert_to_supabase(rows):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
        return False

    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
    }

    batch_size = 50
    total = len(rows)
    for i in range(0, total, batch_size):
        batch = rows[i:i+batch_size]
        r = requests.post(
            f'{SUPABASE_URL}/rest/v1/biodynamic_calendar',
            headers=headers,
            json=batch,
        )
        if r.status_code not in (200, 201):
            print(f'ERROR batch {i//batch_size}: {r.status_code} {r.text[:200]}')
            return False
        print(f'  Upserted {min(i+batch_size, total)}/{total} rows')

    return True

def main():
    print('🌕 Gina Haya — Real Biodynamic Calendar Generator')
    print('   Sources: Maria Thun + Stella Natura + BDI/Rudolf Steiner')
    print('   Ayanamsa: Fagan/Bradley (sidereal)')
    print('=' * 55)

    start_date = (
        datetime.strptime(sys.argv[1], '%Y-%m-%d')
        if len(sys.argv) > 1
        else datetime.now(timezone.utc).replace(tzinfo=None, hour=0, minute=0, second=0, microsecond=0)
    )
    days = int(sys.argv[2]) if len(sys.argv) > 2 else DAYS_TO_GENERATE

    print(f'Generating {days} days from {start_date.strftime("%Y-%m-%d")}')
    print(f'pyswisseph version: {swe.version}')
    print()

    rows, scheduled_500, scheduled_501, scheduled_cpp = generate_calendar_data(start_date, days)

    print(f'\n✓ Generated {len(rows)} calendar rows')

    # Print 5-day sample
    print('\nSample output (first 5 days):')
    for r in rows[:5]:
        sat = '★' if r['moon_opposite_saturn'] else ''
        node = '⚫' if r['node_active'] else ''
        print(f"  {r['date']} | {r['moon_sign_he']:6} | {r['day_type_he']:4} | "
              f"{'↑' if r['ascending_descending']=='ascending' else '↓'} | "
              f"{r['moon_phase_he']:8} | {r['planting_score']}/10 {r['score_colour']:6} "
              f"{sat}{node}")
        print(f"    מון: {r['mon_daily_summary'][:80]}...")

    # BD prep spacing summary
    print('\n' + '═' * 55)
    print('BD PREP SCHEDULING SUMMARY (after cooldown rules)')
    print('═' * 55)
    print(f'פרפרט 500 ({len(scheduled_500)} windows, min 28d gap, max 2/season):')
    for d in scheduled_500:
        print(f'  {d}')
    print(f'\nפרפרט 501 ({len(scheduled_501)} windows, min 14d gap, max 1/month):')
    for d in scheduled_501:
        print(f'  {d}')
    print(f'\nCPP ({len(scheduled_cpp)} windows, min 21d gap):')
    for d in scheduled_cpp:
        print(f'  {d}')

    # Verify spacing
    def verify_spacing(dates, min_days, label):
        for i in range(1, len(dates)):
            from datetime import date as _date
            d1 = datetime.strptime(dates[i-1], '%Y-%m-%d').date()
            d2 = datetime.strptime(dates[i],   '%Y-%m-%d').date()
            gap = (d2 - d1).days
            if gap < min_days:
                print(f'  WARNING: {label} spacing violation — {dates[i-1]} → {dates[i]} = {gap}d (min {min_days}d)')

    verify_spacing(scheduled_500, 28, 'פרפרט 500')
    verify_spacing(scheduled_501, 14, 'פרפרט 501')
    verify_spacing(scheduled_cpp, 21, 'CPP')

    # Check 500/501 never on same day
    set_500 = set(scheduled_500)
    overlap = [d for d in scheduled_501 if d in set_500]
    if overlap:
        print(f'  WARNING: 500 and 501 scheduled on same day: {overlap}')
    else:
        print('\n✓ No 500/501 same-day conflicts')

    # Save and print cleanup SQL
    cleanup_sql = generate_cleanup_sql()
    sql_path = os.path.join(os.path.dirname(__file__), 'cleanup_prep_tasks.sql')
    with open(sql_path, 'w', encoding='utf-8') as f:
        f.write(cleanup_sql)
    print(f'\nCleanup SQL saved to: {sql_path}')
    print('Run it in your Supabase SQL editor to remove duplicate garden_tasks.')

    # Upsert
    print(f'\nUpserting to Supabase...')
    if upsert_to_supabase(rows):
        print(f'\n✅ Done! {len(rows)} real biodynamic calendar days stored in Supabase.')
    else:
        out = 'calendar_output.json'
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(rows, f, ensure_ascii=False, indent=2)
        print(f'\n⚠️  Saved locally to {out} (Supabase upsert failed — check credentials)')

if __name__ == '__main__':
    main()
