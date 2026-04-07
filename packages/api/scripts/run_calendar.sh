#!/bin/bash
# Run the biodynamic calendar generator
# Called by Railway pre-deploy / cron job monthly
set +e  # don't exit on error — failures must never block deployment

echo "Starting biodynamic calendar generation..."
echo "Working directory: $(pwd)"
echo "Python: $(which python3 || which python)"

# Install dependencies
pip install pyswisseph requests --quiet

# Run from wherever we are
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Script dir: $SCRIPT_DIR"

python "$SCRIPT_DIR/generate_calendar.py"
echo "Done!"

exit 0
