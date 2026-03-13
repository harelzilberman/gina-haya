# @gina-haya/i18n

Single source of truth for all translation strings.

## Key naming rules
- camelCase only
- Nested max 3 levels deep
- Semantic names (what it means, not what it looks like)
- Variables: {{variableName}}
- Plurals: key_one, key_other

## Namespaces
- common    — navigation, buttons, generic errors
- auth      — login, signup, onboarding
- calendar  — day types, moon phases, planting scores
- garden    — garden map, plants, soil types
- moosh     — Moosh UI labels and disclaimers
- emails    — email subjects and bodies (used by api)
