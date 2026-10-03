# Supabase auth email templates

Source of truth for the templates pasted into Supabase → Authentication → Emails → Templates.
Supabase has one template per project and doesn't know the user's language, so each email is bilingual: Hebrew first, English below.

| Template in Supabase | File | Subject |
|---|---|---|
| Confirm signup | `confirm-signup.html` | `אישור הרשמה לגינה חיה · Confirm your Gina Haya account` |
| Reset password | `reset-password.html` | `איפוס סיסמה לגינה חיה · Reset your Gina Haya password` |

Links:
- Confirm signup uses `{{ .ConfirmationURL }}`.
- Reset password uses `{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery`. This is the format `ResetPasswordPage.tsx` expects (it calls verifyOtp on tap).

Before saving in the dashboard, compare each button's href with the template currently installed. If the installed one differs, keep the installed href.
Hebrew is checked by Unicode codepoint (final-letter forms at word end only), never by how a terminal renders it.
