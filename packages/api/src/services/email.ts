import 'dotenv/config';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import type { BiodynamicDay } from '@gina-haya/shared';

if (!process.env.RESEND_API_KEY) {
  console.error('[email] RESEND_API_KEY is not set — all email sends will fail');
}
const resend = new Resend(process.env.RESEND_API_KEY!);
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const JWT_SECRET = process.env.JWT_SECRET!;

// Use Resend's test domain in development, real domain in production
const FROM_DOMAIN = process.env.NODE_ENV === 'production'
  ? 'gina-haya.com'
  : 'resend.dev';

const FROM_HE = `צ'ופצ'ו מגינה חיה <onboarding@${FROM_DOMAIN}>`;
const FROM_EN = `ChupChu from Gina Haya <onboarding@${FROM_DOMAIN}>`;


const ADMIN_EMAIL = 'harelzilberman@gmail.com';

const TEMPLATES_DIR = path.join(__dirname, '../templates');
let heTemplate: string;
let enTemplate: string;

function loadTemplates() {
  try {
    if (!heTemplate) {
      heTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'daily-tip-he.html'), 'utf-8');
    }
    if (!enTemplate) {
      enTemplate = fs.readFileSync(path.join(TEMPLATES_DIR, 'daily-tip-en.html'), 'utf-8');
    }
  } catch (err) {
    console.error('Failed to load email templates:', err);
    heTemplate = '<p>{{DATE}} - {{CHUPCHU_SUMMARY}}</p>';
    enTemplate = '<p>{{DATE}} - {{CHUPCHU_SUMMARY}}</p>';
  }
}

export interface EmailUser {
  id: string;
  email: string;
  display_name: string;
  language_preference: 'he' | 'en';
}

const SCORE_COLOUR_MAP: Record<string, string> = {
  green:  '#4A7C59',
  yellow: '#C8A040',
  orange: '#C0622A',
  red:    '#A33030',
  black:  '#333333',
};

const DAY_TYPE_EMOJI: Record<string, string> = {
  fruit:  '🍅',
  root:   '🥕',
  flower: '🌸',
  leaf:   '🌿',
};

const DAY_TYPE_EN: Record<string, string> = {
  fruit:  'Fruit Day',
  root:   'Root Day',
  flower: 'Flower Day',
  leaf:   'Leaf Day',
};

function formatDateHe(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('he-IL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });
}

function formatDateEn(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });
}

function buildUnsubscribeUrl(userId: string): string {
  const token = jwt.sign({ userId, purpose: 'unsubscribe' }, JWT_SECRET, { expiresIn: '1y' });
  return `${APP_URL}/api/email/unsubscribe?token=${token}`;
}

export async function sendDailyTip(user: EmailUser, day: BiodynamicDay): Promise<void> {
  loadTemplates();

  const isHe = user.language_preference === 'he';
  const template = isHe ? heTemplate : enTemplate;
  const scoreColour = SCORE_COLOUR_MAP[day.scoreColour] ?? '#333333';
  const emoji = DAY_TYPE_EMOJI[day.dayType] ?? '';
  const unsubscribeUrl = buildUnsubscribeUrl(user.id);
  const dateFormatted = isHe ? formatDateHe(day.date) : formatDateEn(day.date);

  const prep500Row = day.prep500Recommended
    ? (isHe ? '<tr><td style="padding:8px 0;font-size:14px;color:#4A7C59;font-family:Arial;text-align:right;">✅ זמן מומלץ למריחת פרפרט 500 (16:00–19:00)</td></tr>'
            : '<tr><td style="padding:8px 0;font-size:14px;color:#4A7C59;font-family:Arial;">✅ Recommended time for BD-500 (16:00–19:00)</td></tr>')
    : '';

  const prep501Row = day.prep501Recommended
    ? (isHe ? '<tr><td style="padding:8px 0;font-size:14px;color:#4A7C59;font-family:Arial;text-align:right;">✅ זמן מומלץ למריחת פרפרט 501 (עלות השחר–09:00)</td></tr>'
            : '<tr><td style="padding:8px 0;font-size:14px;color:#4A7C59;font-family:Arial;">✅ Recommended time for BD-501 (sunrise–09:00)</td></tr>')
    : '';

  const subject = isHe
    ? `הטיפ היומי מהגינה — ${dateFormatted}`
    : `Your daily garden tip — ${dateFormatted}`;

  const html = template
    .replace(/\{\{DATE\}\}/g, dateFormatted)
    .replace(/\{\{PLANTING_SCORE\}\}/g, String(day.plantingScore))
    .replace(/\{\{SCORE_COLOUR\}\}/g, scoreColour)
    .replace(/\{\{DAY_TYPE_HE\}\}/g, day.dayTypeHe)
    .replace(/\{\{DAY_TYPE_EN\}\}/g, DAY_TYPE_EN[day.dayType] ?? day.dayType)
    .replace(/\{\{DAY_TYPE_EMOJI\}\}/g, emoji)
    .replace(/\{\{MOON_DIRECTION_HE\}\}/g, day.ascendingDescendingHe)
    .replace(/\{\{MOON_DIRECTION_EN\}\}/g, day.ascendingDescending)
    .replace(/\{\{CHUPCHU_SUMMARY\}\}/g, day.chupChuDailySummary || '')
    .replace(/\{\{PREP_500_ROW\}\}/g, prep500Row)
    .replace(/\{\{PREP_501_ROW\}\}/g, prep501Row)
    .replace(/\{\{APP_URL\}\}/g, APP_URL)
    .replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);

  const { error } = await resend.emails.send({
    from: isHe ? FROM_HE : FROM_EN,
    to: user.email,
    subject,
    html,
  });

  if (error) {
    console.error('[sendDailyTip] Resend error:', JSON.stringify(error));
    throw new Error(`Failed to send daily tip: ${error.message}`);
  }

  console.log(`[sendDailyTip] Sent to ${user.email}`);
}

export async function sendWelcome(user: EmailUser): Promise<void> {
  const isHe = user.language_preference === 'he';
  const name = user.display_name || user.email;

  const subject = isHe ? 'ברוכים הבאים לגינה חיה! 🌱' : 'Welcome to Gina Haya! 🌱';

  const html = isHe ? `
    <div dir="rtl" style="font-family:Arial;max-width:600px;margin:0 auto;padding:32px;">
      <h2 style="color:#1B2A4A;">שלום ${name}! 🌱</h2>
      <p style="color:#444;">ברוכים הבאים לגינה חיה!</p>
      <p style="color:#444;">צ'ופצ'ו כאן — המומחה הביודינמי שלך שישמור על הגינה.</p>
      <p style="color:#444;">כל בוקר תקבל טיפ יומי ביודינמי עם ציון הזריעה של היום ועצות מותאמות אישית לגינה שלך.</p>
      <p style="color:#B7924A;font-style:italic;">"הגינה מחכה לך. היא תמיד שם."</p>
      <a href="${APP_URL}" style="display:inline-block;background:#4A7C59;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;margin-top:16px;">פתח את הגינה שלי</a>
    </div>
  ` : `
    <div style="font-family:Arial;max-width:600px;margin:0 auto;padding:32px;">
      <h2 style="color:#1B2A4A;">Hello ${name}! 🌱</h2>
      <p style="color:#444;">Welcome to Gina Haya!</p>
      <p style="color:#444;">ChupChu here — your biodynamic expert, ready to look after your garden.</p>
      <p style="color:#444;">Every morning you'll receive a personalised biodynamic daily tip with today's planting score and ChupChu's garden recommendations.</p>
      <p style="color:#B7924A;font-style:italic;">"The garden is waiting for you. It is always there."</p>
      <a href="${APP_URL}" style="display:inline-block;background:#4A7C59;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;margin-top:16px;">Open my garden</a>
    </div>
  `;

  const { error } = await resend.emails.send({
    from: isHe ? FROM_HE : FROM_EN,
    to: user.email,
    subject,
    html,
  });

  if (error) {
    console.error('[sendWelcome] Resend error:', JSON.stringify(error));
    throw new Error(`Failed to send welcome email: ${error.message}`);
  }

  console.log(`[sendWelcome] Sent to ${user.email}`);
}

export async function sendCancellationRequestNotice(opts: {
  customerEmail: string;
  customerName:  string;
  tier:          string;
  purchaseToken: string;
  periodEnd:     Date;
}): Promise<void> {
  const { customerEmail, customerName, tier, purchaseToken, periodEnd } = opts;

  const periodEndStr = periodEnd.toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });

  const subject = `[גינה חיה] ביטול מנוי Grow — ${customerEmail}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
      <h2 style="color:#050d0a;font-size:20px;margin:0 0 16px;">⚠️ בקשת ביטול מנוי — Grow הוראת קבע</h2>
      <p style="color:#374151;font-size:15px;margin:0 0 8px;"><strong>לקוח/ה:</strong> ${customerName || '(ללא שם)'}</p>
      <p style="color:#374151;font-size:15px;margin:0 0 8px;"><strong>אימייל:</strong> ${customerEmail}</p>
      <p style="color:#374151;font-size:15px;margin:0 0 8px;"><strong>תוכנית:</strong> ${tier}</p>
      <p style="color:#374151;font-size:15px;margin:0 0 8px;"><strong>מזהה עסקה (Grow):</strong> <code style="font-size:13px;background:#e5e7eb;padding:2px 6px;border-radius:4px;">${purchaseToken}</code></p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;"><strong>סוף תקופת גישה:</strong> ${periodEndStr}</p>
      <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:16px;margin:0 0 20px;">
        <p style="color:#92400e;font-size:14px;margin:0;font-weight:600;">
          נדרשת פעולה ידנית: בטל את ההוראת קבע של הלקוח/ה בלוח הניהול של Grow לפני ${periodEndStr}.<br>
          אם לא יבוטל בזמן, Grow עלול לחייב מחזור נוסף.
        </p>
      </div>
      <p style="color:#6b7280;font-size:13px;margin:0;">
        הגישה של הלקוח/ה תמשיך עד ${periodEndStr} ואז תרד אוטומטית לחינם — ללא קשר לביטול ב-Grow.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from:    FROM_HE,
    to:      ADMIN_EMAIL,
    subject,
    html,
  });

  if (error) {
    console.error('[sendCancellationRequestNotice] Resend error:', JSON.stringify(error));
    throw new Error(`Failed to send cancellation notice: ${error.message}`);
  }

  console.log(`[sendCancellationRequestNotice] Sent to ${ADMIN_EMAIL} for customer=${customerEmail}`);
}

// Sent to the admin whenever a billing grant (credits or tier) fails.
// Never throws — a failed alert must not interrupt the webhook handler.
export async function sendGrantFailureAlert(opts: {
  context:       string;        // 'credit_grant' | 'tier_grant'
  userId:        string;
  userEmail:     string | undefined;
  productOrTier: string;        // productId for credits, tier name for subscriptions
  quantity?:     number;        // omit for tier grants
  transactionId: string | null | undefined;
  provider:      string;
  errorMessage:  string;
}): Promise<void> {
  const { context, userId, userEmail, productOrTier, quantity, transactionId, provider, errorMessage } = opts;
  const timestamp = new Date().toISOString();

  const subject = `[Gina Haya] BILLING FAILURE — ${context} (${provider})`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fff3f3;border-radius:12px;border:2px solid #f87171;">
      <h2 style="color:#991b1b;font-size:20px;margin:0 0 16px;">Billing Grant Failed</h2>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Time (UTC):</strong> ${timestamp}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Context:</strong> ${context}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Provider:</strong> ${provider}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>User ID:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:12px;">${userId}</code></p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>User email:</strong> ${userEmail ?? '(not resolved)'}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Product / tier:</strong> ${productOrTier}${quantity != null ? ` \u00d7 ${quantity}` : ''}</p>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;"><strong>Transaction ID:</strong> <code style="background:#e5e7eb;padding:2px 6px;border-radius:4px;font-size:12px;">${transactionId ?? '(none)'}</code></p>
      <p style="color:#374151;font-size:14px;margin:0 0 20px;"><strong>Error:</strong> <code style="background:#fee2e2;padding:4px 8px;border-radius:4px;font-size:12px;">${errorMessage}</code></p>
      <div style="background:#fef9c3;border:1px solid #eab308;border-radius:8px;padding:16px;">
        <p style="color:#713f12;font-size:14px;margin:0;font-weight:600;">
          Manual action required: check user_purchases (status=grant_failed) or user_subscriptions,
          then grant credits or update subscription_tier directly in Supabase.
        </p>
      </div>
    </div>
  `;

  try {
    const { error } = await resend.emails.send({
      from:    FROM_EN,
      to:      ADMIN_EMAIL,
      subject,
      html,
    });
    if (error) {
      console.error('[sendGrantFailureAlert] Resend error:', JSON.stringify(error));
    } else {
      console.log(`[sendGrantFailureAlert] Alert sent for context=${context} user=${userId} product/tier=${productOrTier}`);
    }
  } catch (err: any) {
    // Never throw — a failed alert must not break the webhook handler.
    console.error('[sendGrantFailureAlert] Unexpected error:', err?.message ?? String(err));
  }
}

export async function sendRenewalReminder(opts: {
  email:       string;
  displayName: string;
  tierNameHe:  string;
  expiresAt:   Date;
  language?:   'he' | 'en';
}): Promise<void> {
  const { email, displayName, tierNameHe, expiresAt, language } = opts;
  // Default Hebrew — English only when explicitly set.
  const isHe = language !== 'en';
  const name = displayName || email;

  const expiryStr = expiresAt.toLocaleDateString(isHe ? 'he-IL' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    timeZone: 'Asia/Jerusalem',
  });

  const pricingUrl = `${APP_URL}/pricing`;

  // NOTE: tierNameHe is the Hebrew tier name (e.g. "גנן ביתי") and is used in
  // both language variants. English tier display names are a brand decision left
  // for a separate pass — do not translate them here.
  const html = isHe ? `
    <div dir="rtl" style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
      <h2 style="color:#050d0a;font-size:22px;margin:0 0 8px;">🌿 המנוי שלך מסתיים בקרוב</h2>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">שלום ${name},</p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">
        מנוי <strong style="color:#050d0a;">${tierNameHe}</strong> שלך ב-גינה חיה יסתיים בתאריך
        <strong style="color:#050d0a;">${expiryStr}</strong>.
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 28px;">
        כדי להמשיך ליהנות מכל התכונות, חדש את המנוי שלך לפני שיסתיים.
      </p>
      <a
        href="${pricingUrl}"
        style="display:inline-block;background:#00e5c3;color:#050d0a;font-weight:700;font-size:15px;padding:14px 28px;border-radius:100px;text-decoration:none;"
      >
        חדש את המנוי שלך
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:32px 0 0;">
        קיבלת מייל זה כי יש לך מנוי שנתי פעיל בגינה חיה.
        לשאלות פנה אלינו על ידי מענה למייל זה.
      </p>
    </div>
  ` : `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#f9fafb;border-radius:12px;">
      <h2 style="color:#050d0a;font-size:22px;margin:0 0 8px;">🌿 Your subscription is ending soon</h2>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">Hello ${name},</p>
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">
        Your <strong style="color:#050d0a;">${tierNameHe}</strong> subscription on Gina Haya expires on
        <strong style="color:#050d0a;">${expiryStr}</strong>.
      </p>
      <p style="color:#374151;font-size:15px;margin:0 0 28px;">
        To continue enjoying all features, renew your subscription before it expires.
      </p>
      <a
        href="${pricingUrl}"
        style="display:inline-block;background:#00e5c3;color:#050d0a;font-weight:700;font-size:15px;padding:14px 28px;border-radius:100px;text-decoration:none;"
      >
        Renew your subscription
      </a>
      <p style="color:#9ca3af;font-size:12px;margin:32px 0 0;">
        You received this email because you have an active annual subscription on Gina Haya.
        For questions, reply to this email.
      </p>
    </div>
  `;

  const { error } = await resend.emails.send({
    from:    isHe ? FROM_HE : FROM_EN,
    to:      email,
    subject: isHe
      ? `המנוי שלך ב-גינה חיה מסתיים ב-${expiryStr} — חידוש מהיר`
      : `Your Gina Haya subscription expires on ${expiryStr} — quick renewal`,
    html,
  });

  if (error) {
    console.error('[sendRenewalReminder] Resend error:', JSON.stringify(error));
    throw new Error(`Failed to send renewal reminder: ${error.message}`);
  }

  console.log(`[sendRenewalReminder] Sent to ${email}`);
}
