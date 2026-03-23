#!/bin/bash
# Run the biodynamic calendar generator
# Called by Railway cron job monthly

echo "Starting biodynamic calendar generation..."
cd /app
pip install -r packages/api/scripts/requirements.txt --quiet
python packages/api/scripts/generate_calendar.py
echo "Done!"
