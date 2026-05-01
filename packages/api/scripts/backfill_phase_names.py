#!/usr/bin/env python3
"""
One-time backfill: fix non-standard moon_phase_name_he / moon_phase_he values.

Old name            → New name
'כמעט מלא' (pct<98) → 'גיבנת גדלה'
'כמעט מלא' (pct≥98) → 'ירח מלא'
'מתמעט'             → 'גיבנת קטנה'
'סהר פוחת'          → 'סהר קטן'

Also prints today's row (2026-05-01) for FIX 2 verification.
"""

import os
import requests

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

SUPABASE_URL = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    exit(1)

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
}

OLD_NAMES = ['כמעט מלא', 'מתמעט', 'סהר פוחת']


def fetch_today_row():
    url = f'{SUPABASE_URL}/rest/v1/biodynamic_calendar?select=date,moon_sign_he,day_type,moon_phase_name_he,moon_phase_pct&date=eq.2026-05-01'
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    rows = r.json()
    return rows[0] if rows else None


def fetch_stale_rows():
    """Fetch all rows where moon_phase_name_he has an old non-standard name."""
    all_rows = []
    for name in OLD_NAMES:
        url = (f'{SUPABASE_URL}/rest/v1/biodynamic_calendar'
               f'?select=date,moon_phase_name_he,moon_phase_pct'
               f'&moon_phase_name_he=eq.{requests.utils.quote(name)}'
               f'&order=date.asc&limit=5000')
        r = requests.get(url, headers=HEADERS)
        r.raise_for_status()
        all_rows.extend(r.json())
    return all_rows


def new_name_for(row):
    old = row['moon_phase_name_he']
    pct = row.get('moon_phase_pct') or 0
    if old == 'כמעט מלא':
        return 'ירח מלא' if pct >= 98 else 'גיבנת גדלה'
    if old == 'מתמעט':
        return 'גיבנת קטנה'
    if old == 'סהר פוחת':
        return 'סהר קטן'
    return old


def patch_row(date, name_he):
    url = f'{SUPABASE_URL}/rest/v1/biodynamic_calendar?date=eq.{date}'
    r = requests.patch(url, headers=HEADERS, json={
        'moon_phase_name_he': name_he,
        'moon_phase_he':      name_he,
    })
    r.raise_for_status()


def main():
    # ── FIX 2 verification: print today's row ──────────────────────────────
    print('── Today\'s row (2026-05-01) ──────────────────────────────────')
    today = fetch_today_row()
    if today:
        print(f"  date:              {today['date']}")
        print(f"  moon_sign_he:      {today['moon_sign_he']}")
        print(f"  day_type:          {today['day_type']}")
        print(f"  moon_phase_name_he:{today['moon_phase_name_he']}")
        print(f"  moon_phase_pct:    {today['moon_phase_pct']}")
        if today['moon_sign_he'] == 'עקרב' and today['day_type'] != 'leaf':
            print(f"  ⚠ BUG: Scorpio (עקרב) should be day_type=leaf, got '{today['day_type']}'")
        elif today['moon_sign_he'] == 'עקרב':
            print(f"  ✓ Scorpio (עקרב) → day_type=leaf — correct")
        else:
            print(f"  ℹ Moon is not in Scorpio today ({today['moon_sign_he']})")
    else:
        print('  No row found for 2026-05-01')

    print()

    # ── FIX 1: backfill stale phase names ─────────────────────────────────
    print('── Phase name backfill ───────────────────────────────────────')
    rows = fetch_stale_rows()
    if not rows:
        print('No stale rows found — all moon_phase_name_he values are already standard.')
        return

    print(f'Found {len(rows)} rows to fix.')
    updated = 0
    for row in rows:
        new = new_name_for(row)
        patch_row(row['date'], new)
        print(f"  {row['date']} : '{row['moon_phase_name_he']}' → '{new}' (pct={row['moon_phase_pct']})")
        updated += 1

    print(f'\nDone. {updated} rows updated.')


if __name__ == '__main__':
    main()
