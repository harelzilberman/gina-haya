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

# 1. Legacy Israel calendar (biodynamic_calendar)
echo "▶ [1/2] biodynamic_calendar (Israel) — start"
python "$SCRIPT_DIR/generate_calendar.py"
echo "✔ [1/2] biodynamic_calendar (Israel) — done (exit code $?)"

# 2. Timezone × hemisphere variants (biodynamic_calendar_variants), same 400-day default
echo "▶ [2/2] biodynamic_calendar_variants (54 variants) — start"
python "$SCRIPT_DIR/generate_calendar.py" --variants
echo "✔ [2/2] biodynamic_calendar_variants — done (exit code $?)"

echo "Done!"

exit 0
