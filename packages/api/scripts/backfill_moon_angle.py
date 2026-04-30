#!/usr/bin/env python3
"""
One-time backfill: populate moon_phase_angle for rows where it is NULL.
Uses the correct inverse illumination formula:
  angle = acos(1 - 2 * pct/100) * 180/pi
"""

import os
import math
import requests

# Load .env when running locally (no-op if already set by the environment)
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


def fetch_null_rows():
    # Use raw URL — requests params= encodes '.' in values which breaks PostgREST filters
    url = (f'{SUPABASE_URL}/rest/v1/biodynamic_calendar'
           f'?select=date,moon_phase_pct&moon_phase_angle=is.null&order=date.asc&limit=10000')
    r = requests.get(url, headers=HEADERS)
    r.raise_for_status()
    return r.json()


def update_row(date: str, angle: float):
    url = f'{SUPABASE_URL}/rest/v1/biodynamic_calendar?date=eq.{date}'
    r = requests.patch(url, headers=HEADERS, json={'moon_phase_angle': round(angle, 2)})
    r.raise_for_status()


def main():
    print('Fetching rows with NULL moon_phase_angle...')
    rows = fetch_null_rows()
    total = len(rows)

    if total == 0:
        print('No rows to backfill. All moon_phase_angle values are already populated.')
        return

    print(f'Found {total} rows to backfill.')

    updated = 0
    for row in rows:
        pct = row.get('moon_phase_pct') or 0
        pct_fraction = pct / 100
        angle = math.acos(max(-1.0, min(1.0, 1 - 2 * pct_fraction))) * (180 / math.pi)
        update_row(row['date'], angle)
        updated += 1
        if updated % 50 == 0:
            print(f'Updated {updated} rows')

    print(f'Backfill complete. {total} rows updated.')


if __name__ == '__main__':
    main()
