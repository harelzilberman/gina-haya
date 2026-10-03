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

Both links match the templates installed 22–26 Sep 2026. Confirm signup deliberately stays on `{{ .ConfirmationURL }}` so it respects the app's `redirect_to` (ginahaya://auth). In the HTML the reset link's `&` is written as `&amp;`.
Hebrew is checked by Unicode codepoint (final-letter forms at word end only), never by how a terminal renders it.
