import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PlayBadge } from '../components/ui/PlayBadge';
import { playStoreUrl } from '../config/app-links';

// ── Design tokens (matching LandingPage) ───────────────────────────────────
const NIGHT      = '#050d0a';
const NIGHT_MID  = '#091410';
const NIGHT_LIFT = '#0e1e17';
const NIGHT_CARD = '#111f18';
const BIO_CYAN   = '#00e5c3';
const BIO_AMBER  = '#ffb830';
const TEXT       = '#e8f5ee';
const TEXT_MID   = '#b0cfbf';
const MUTED      = '#6b9080';
const FRANK      = '"Frank Ruhl Libre", Georgia, serif';
const DM_SANS    = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const SCREENSHOTS: Array<{ src: string; captionHe: string; captionEn: string }> = [
  {
    src:       '/images/app/screenshot-home.png',
    captionHe: '\u05de\u05e1\u05da \u05d4\u05d1\u05d9\u05ea\u003a \u05d9\u05e8\u05d7\u002c \u05e1\u05d5\u05d2 \u05d4\u05d9\u05d5\u05dd\u002c \u05d5\u05d8\u05d9\u05e4 \u05d9\u05d5\u05de\u05d9 \u05de\u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5',
    captionEn: 'Home screen: moon, day type, and daily tip from Chupchu',
  },
  {
    src:       '/images/app/screenshot-chupchu.png',
    captionHe: '\u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5 \u05de\u05d6\u05d4\u05d4 \u05e6\u05de\u05d7\u05d9\u05dd \u05d5\u05de\u05e0\u05ea\u05d7 \u05ea\u05de\u05d5\u05e0\u05d5\u05ea \u05de\u05d4\u05d2\u05d9\u05e0\u05d4',
    captionEn: 'Chupchu identifies plants and analyses garden photos',
  },
  {
    src:       '/images/app/screenshot-calendar.png',
    captionHe: '\u05d4\u05dc\u05d5\u05d7 \u05d4\u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9 \u05d4\u05d7\u05d5\u05d3\u05e9\u05d9 \u05dc\u05e4\u05d9 \u05e1\u05d5\u05d2\u05d9 \u05d9\u05de\u05d9\u05dd',
    captionEn: 'Monthly biodynamic calendar by day type',
  },
  {
    src:       '/images/app/screenshot-gallery.png',
    captionHe: '\u05ea\u05d9\u05e2\u05d5\u05d3 \u05de\u05e6\u05d5\u05dc\u05dd \u05e9\u05dc \u05db\u05dc \u05e6\u05de\u05d7 \u05dc\u05d0\u05d5\u05e8\u05da \u05d6\u05de\u05df',
    captionEn: 'Photo documentation of every plant over time',
  },
];

const FEATURES_HE = [
  { icon: '🔍', title: '\u05d0\u05d1\u05d7\u05d5\u05df \u05e6\u05de\u05d7\u05d9\u05dd',       body: "\u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5 \u05de\u05d6\u05d4\u05d4 \u05db\u05dc \u05e6\u05de\u05d7 \u05de\u05ea\u05de\u05d5\u05e0\u05d4 \u05d5\u05de\u05d0\u05d1\u05d7\u05df \u05de\u05d7\u05dc\u05d5\u05ea \u05d5\u05d1\u05e2\u05d9\u05d5\u05ea \u05ea\u05d6\u05d5\u05e0\u05ea\u05d9\u05d5\u05ea" },
  { icon: '📅', title: '\u05dc\u05d5\u05d7 \u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9',   body: '\u05d9\u05de\u05d9 \u05e9\u05ea\u05d9\u05dc\u05d4\u002c \u05e7\u05e6\u05d9\u05e8\u002c \u05e4\u05e8\u05d9\u05d7\u05d4 \u05d5\u05e9\u05d5\u05e8\u05e9 — \u05dc\u05e4\u05d9 \u05e0\u05ea\u05d5\u05e0\u05d9\u05dd \u05d0\u05e1\u05d8\u05e8\u05d5\u05e0\u05d5\u05de\u05d9\u05d9\u05dd \u05d0\u05de\u05d9\u05ea\u05d9\u05d9\u05dd' },
  { icon: '🌙', title: '\u05dc\u05d5\u05d7 \u05d4\u05d9\u05e8\u05d7',                          body: '\u05de\u05d7\u05d6\u05d5\u05e8\u05d9 \u05d9\u05e8\u05d7 \u05d1\u05d6\u05de\u05df \u05d0\u05de\u05ea \u05dc\u05ea\u05db\u05e0\u05d5\u05df \u05e2\u05d1\u05d5\u05d3\u05ea \u05d4\u05d2\u05d9\u05e0\u05d4 \u05d4\u05e0\u05db\u05d5\u05e0\u05d4' },
  { icon: '🌿', title: '\u05de\u05e2\u05e7\u05d1 \u05d2\u05d9\u05e0\u05d4',                     body: '\u05ea\u05d9\u05e2\u05d5\u05d3 \u05db\u05dc \u05e6\u05de\u05d7 \u05e2\u05dd \u05ea\u05de\u05d5\u05e0\u05d5\u05ea\u002c \u05d4\u05e2\u05e8\u05d5\u05ea \u05d5\u05e1\u05d8\u05d9\u05d9\u05d8\u05d5\u05e1 \u05e0\u05d1\u05d9\u05d8\u05d4 \u05d1\u05d6\u05de\u05df \u05d0\u05de\u05ea' },
  { icon: '✅', title: '\u05de\u05e9\u05d9\u05de\u05d5\u05ea \u05d7\u05db\u05de\u05d5\u05ea',   body: '\u05ea\u05d6\u05db\u05d5\u05e8\u05d5\u05ea \u05d4\u05e9\u05e7\u05d9\u05d4\u002c \u05d3\u05e9\u05d9\u05e0\u05d4 \u05d5\u05e2\u05d1\u05d5\u05d3\u05d5\u05ea \u05e9\u05d5\u05d8\u05e4\u05d5\u05ea \u05d1\u05d6\u05de\u05df \u05d4\u05e0\u05db\u05d5\u05df' },
  { icon: '🖼️', title: '\u05d2\u05dc\u05e8\u05d9\u05d9\u05ea \u05ea\u05de\u05d5\u05e0\u05d5\u05ea', body: '\u05d0\u05e8\u05db\u05d9\u05d5\u05df \u05d7\u05d6\u05d5\u05ea\u05d9 \u05e9\u05dc \u05d4\u05d2\u05d9\u05e0\u05d4 \u05dc\u05d0\u05d5\u05e8\u05da \u05d4\u05e2\u05d5\u05e0\u05d5\u05ea' },
];

const FEATURES_EN = [
  { icon: '🔍', title: 'Plant Diagnosis',    body: 'Chupchu identifies any plant from a photo and diagnoses health issues' },
  { icon: '📅', title: 'Biodynamic Calendar', body: 'Planting, harvest, flower and root days — by real astronomical data' },
  { icon: '🌙', title: 'Moon Calendar',       body: 'Real-time lunar cycles to plan garden work precisely' },
  { icon: '🌿', title: 'Garden Tracker',      body: 'Document each plant with photos, notes and growth status' },
  { icon: '✅', title: 'Smart Tasks',         body: 'Watering, fertilising and routine task reminders at the right time' },
  { icon: '🖼️', title: 'Photo Gallery',      body: 'A seasonal visual archive of your garden over time' },
];

const FAQ_HE: Array<{ q: string; a: string }> = [
  {
    q: '\u05d4\u05d0\u05dd \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05d6\u05de\u05d9\u05e0\u05d4 \u05dc\u002d\u05d9\u05d5\u05e7\u05e1\u05e4\u05d8 \u05d5\u0020iOS\u003f',
    a:  '\u05db\u05e8\u05d2\u05e2 \u05d6\u05de\u05d9\u05e0\u05d4 \u05dc\u002d\u05d9\u05d5\u05e7\u05e1\u05e4\u05d8 \u005bAndroid\u005d \u05d1\u05dc\u05d1\u05d3. \u05d2\u05e8\u05e1\u05ea iOS \u05d1\u05ea\u05db\u05e0\u05d5\u05df.',
  },
  {
    q: '\u05d4\u05d0\u05dd \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05e2\u05d5\u05d1\u05d3\u05ea \u05d1\u05db\u05dc \u05d4\u05e2\u05d5\u05dc\u05dd\u003f',
    a:  '\u05db\u05e8\u05d2\u05e2 \u05dc\u05d9\u05e9\u05e8\u05d0\u05dc \u05d1\u05dc\u05d1\u05d3. \u05ea\u05de\u05d9\u05db\u05d4 \u05d1\u05de\u05d3\u05d9\u05e0\u05d5\u05ea \u05e0\u05d5\u05e1\u05e4\u05d5\u05ea \u05d1\u05ea\u05db\u05e0\u05d5\u05df.',
  },
  {
    q: '\u05d4\u05d0\u05dd \u05e6\u05e8\u05d9\u05da \u05d7\u05e9\u05d1\u05d5\u05df\u003f',
    a:  '\u05db\u05df\u002c \u05e0\u05d3\u05e8\u05e9\u05ea \u05d4\u05e8\u05e9\u05de\u05d4. \u05d0\u05e4\u05e9\u05e8 \u05dc\u05d4\u05d9\u05e8\u05e9\u05dd \u05d1\u05d7\u05d9\u05e0\u05dd \u05d1\u05d0\u05ea\u05e8 \u05d0\u05d5 \u05d1\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4.',
  },
  {
    q: '\u05de\u05d4 \u05db\u05dc\u05d5\u05dc \u05d1\u05ea\u05d5\u05db\u05e0\u05d9\u05ea \u05d4\u05d7\u05d9\u05e0\u05de\u05d9\u05ea\u003f',
    a:  '\u05db 20 \u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05dc\u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5 \u05dc\u05d7\u05d5\u05d3\u05e9\u002c \u05d2\u05d9\u05e0\u05d4 \u05d0\u05d7\u05ea\u002c 10 \u05e6\u05de\u05d7\u05d9\u05dd\u002c \u05d5\u05dc\u05d5\u05d7 \u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9 \u05de\u05dc\u05d0.',
  },
];

const FAQ_EN: Array<{ q: string; a: string }> = [
  { q: 'Is the app available for iOS?',          a: 'Android only for now. iOS is planned.' },
  { q: 'Does the app work outside Israel?',      a: 'Israel only for now. More regions are planned.' },
  { q: 'Do I need an account?',                  a: 'Yes, a free registration is required — sign up on the website or in the app.' },
  { q: "What's included in the free plan?",      a: "~20 Chupchu messages/month, one garden, 10 plants, and full biodynamic calendar." },
];

export function AppPage() {
  const { i18n } = useTranslation();
  const isHe = i18n.language === 'he';
  const features = isHe ? FEATURES_HE : FEATURES_EN;
  const faq = isHe ? FAQ_HE : FAQ_EN;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = isHe
      ? '\u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4 \u05dc\u05d0\u05e0\u05d3\u05e8\u05d5\u05d0\u05d9\u05d3 \u2013 \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4 \u05d4\u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9\u05ea'
      : 'Gina Haya for Android – Biodynamic Gardening App';

    const metaDesc = document.querySelector('meta[name="description"]');
    const prevDesc = metaDesc?.getAttribute('content') ?? '';
    const newDesc = isHe
      ? '\u05d4\u05d5\u05e8\u05d3\u05d5 \u05d0\u05ea \u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4 \u05dc\u05d0\u05e0\u05d3\u05e8\u05d5\u05d0\u05d9\u05d3. \u05dc\u05d5\u05d7 \u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9\u002c \u05d0\u05d1\u05d7\u05d5\u05df \u05e6\u05de\u05d7\u05d9\u05dd \u05e2\u05dd \u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5\u002c \u05de\u05e2\u05e7\u05d1 \u05d2\u05d9\u05e0\u05d4 \u05d5\u05ea\u05d6\u05db\u05d5\u05e8\u05d5\u05ea \u05d4\u05e9\u05e7\u05d9\u05d4.'
      : 'Download Gina Haya for Android. Biodynamic calendar, plant diagnosis with Chupchu, garden tracker and watering reminders.';
    if (metaDesc) metaDesc.setAttribute('content', newDesc);

    // JSON-LD
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'app-page-jsonld';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: '\u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4',
      operatingSystem: 'Android',
      applicationCategory: 'LifestyleApplication',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'ILS',
      },
      url: playStoreUrl('app_page_jsonld'),
    });
    document.head.appendChild(script);

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.setAttribute('content', prevDesc);
      document.getElementById('app-page-jsonld')?.remove();
    };
  }, [isHe]);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = NIGHT;
    return () => { document.body.style.backgroundColor = prev; };
  }, []);

  return (
    <div style={{ backgroundColor: NIGHT, minHeight: '100vh', direction: isHe ? 'rtl' : 'ltr' }}>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative', zIndex: 1,
        backgroundColor: NIGHT,
        padding: '80px 28px 96px',
        textAlign: 'center',
        borderBottom: '1px solid rgba(0,229,195,0.07)',
      }}>
        {/* Ambient glow */}
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(0,229,195,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '680px', margin: '0 auto' }}>
          {/* Eyebrow */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'rgba(255,184,48,0.08)', border: '1px solid rgba(255,184,48,0.28)',
            borderRadius: '100px', padding: '6px 18px', marginBottom: '32px',
            fontFamily: DM_SANS, fontSize: '12px', fontWeight: 600, color: BIO_AMBER,
            letterSpacing: '0.06em',
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: BIO_AMBER, display: 'inline-block' }} />
            {isHe ? '\u05d6\u05de\u05d9\u05e0\u05d4 \u05e2\u05db\u05e9\u05d9\u05d5 \u05d1\u002d\u05d2\u05d5\u05d2\u05dc \u05e4\u05dc\u05d9\u05d9' : 'Now live on Google Play'}
          </div>

          <h1 style={{
            fontFamily: FRANK, fontWeight: 700,
            fontSize: 'clamp(36px, 6vw, 72px)',
            color: TEXT, lineHeight: 1.15, marginBottom: '20px',
          }}>
            {isHe
              ? <>\u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4{' '}<span style={{ color: BIO_CYAN }}>\u05d1\u05db\u05d9\u05e1 \u05e9\u05dc\u05da</span></>
              : <>Gina Haya{' '}<span style={{ color: BIO_CYAN }}>in your pocket</span></>
            }
          </h1>

          <p style={{
            fontFamily: DM_SANS, fontWeight: 300, fontSize: 'clamp(15px, 2vw, 18px)',
            lineHeight: 1.75, color: TEXT_MID, marginBottom: '40px',
          }}>
            {isHe
              ? '\u05d4\u05dc\u05d5\u05d7 \u05d4\u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9\u002c \u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5 \u05d0\u05d9 \u05d0\u05d9 \u05dc\u05d0\u05d1\u05d7\u05d5\u05df \u05e6\u05de\u05d7\u05d9\u05dd\u002c \u05d5\u05de\u05e2\u05e7\u05d1 \u05e9\u05dc\u05dd \u05e9\u05dc \u05d4\u05d2\u05d9\u05e0\u05d4 \u2014 \u05d4\u05db\u05dc \u05d1\u05d8\u05dc\u05e4\u05d5\u05df \u05d0\u05d7\u05d3.'
              : 'The biodynamic calendar, Chupchu AI plant diagnosis, and your full garden tracker — all in one phone.'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PlayBadge source="app_page" loading="eager" />
          </div>
        </div>
      </section>

      {/* ══ FEATURE GRID ══════════════════════════════════════════════════════ */}
      <section style={{
        backgroundColor: NIGHT_MID, padding: '80px 28px',
        borderBottom: '1px solid rgba(0,229,195,0.07)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{
              fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: BIO_CYAN, marginBottom: '14px',
            }}>
              {isHe ? '\u05de\u05d4 \u05ea\u05de\u05e6\u05d0\u05d5 \u05d1\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4' : "What's in the app"}
            </p>
            <h2 style={{
              fontFamily: FRANK, fontWeight: 700,
              fontSize: 'clamp(24px, 3.5vw, 40px)', color: TEXT, lineHeight: 1.25,
            }}>
              {isHe
                ? <>\u05db\u05dc \u05d4\u05db\u05dc\u05d9\u05dd \u05e9\u05dc{' '}<span style={{ color: BIO_CYAN }}>\u05d2\u05e0\u05df \u05d1\u05d9\u05d5\u05d3\u05d9\u05e0\u05de\u05d9</span></>
                : <>All the tools of a{' '}<span style={{ color: BIO_CYAN }}>biodynamic gardener</span></>
              }
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {features.map(f => (
              <div key={f.title} style={{
                background: NIGHT_CARD,
                border: '1px solid rgba(0,229,195,0.10)',
                borderRadius: '16px', padding: '28px 24px',
                transition: 'border-color 0.3s, transform 0.3s',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,229,195,0.3)'; el.style.transform = 'translateY(-4px)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(0,229,195,0.10)'; el.style.transform = 'none'; }}
              >
                <div style={{ fontSize: '28px', marginBottom: '16px' }}>{f.icon}</div>
                <h3 style={{
                  fontFamily: FRANK, fontWeight: 700, fontSize: '17px',
                  color: TEXT, marginBottom: '8px',
                }}>
                  {f.title}
                </h3>
                <p style={{
                  fontFamily: DM_SANS, fontWeight: 300, fontSize: '14px',
                  color: TEXT_MID, lineHeight: 1.7,
                }}>
                  {f.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ SCREENSHOT GALLERY ════════════════════════════════════════════════ */}
      <section style={{
        backgroundColor: NIGHT, padding: '80px 28px',
        borderBottom: '1px solid rgba(0,229,195,0.07)',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{
              fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: BIO_CYAN, marginBottom: '14px',
            }}>
              {isHe ? '\u05e6\u05d9\u05dc\u05d5\u05de\u05d9 \u05de\u05e1\u05da' : 'Screenshots'}
            </p>
            <h2 style={{
              fontFamily: FRANK, fontWeight: 700,
              fontSize: 'clamp(22px, 3vw, 36px)', color: TEXT, lineHeight: 1.25,
            }}>
              {isHe ? '\u05d0\u05d9\u05da \u05e0\u05e8\u05d0\u05d9\u05ea \u05d4\u05d0\u05e4\u05dc\u05d9\u05e7\u05e6\u05d9\u05d4' : 'A look inside the app'}
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
          }}>
            {SCREENSHOTS.map(s => (
              <div key={s.src} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  borderRadius: '20px', overflow: 'hidden',
                  border: '1px solid rgba(0,229,195,0.15)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.45)',
                  background: NIGHT_LIFT,
                  aspectRatio: '9/19',
                }}>
                  <img
                    src={s.src}
                    alt={isHe ? s.captionHe : s.captionEn}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </div>
                <p style={{
                  fontFamily: DM_SANS, fontSize: '13px', color: TEXT_MID,
                  lineHeight: 1.55, textAlign: 'center',
                }}>
                  {isHe ? s.captionHe : s.captionEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ═══════════════════════════════════════════════════════════ */}
      <section style={{
        backgroundColor: NIGHT_MID, padding: '80px 28px',
        borderBottom: '1px solid rgba(0,229,195,0.07)',
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{
              fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: BIO_CYAN, marginBottom: '14px',
            }}>
              {isHe ? '\u05ea\u05de\u05d7\u05d5\u05e8' : 'Pricing'}
            </p>
            <h2 style={{
              fontFamily: FRANK, fontWeight: 700,
              fontSize: 'clamp(22px, 3vw, 36px)', color: TEXT, lineHeight: 1.25,
            }}>
              {isHe ? '\u05d4\u05ea\u05d7\u05d9\u05dc\u05d5 \u05d1\u05d7\u05d9\u05e0\u05dd' : 'Start for free'}
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Free plan */}
            <div style={{
              background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.12)',
              borderRadius: '20px', padding: '32px 28px',
            }}>
              <p style={{ fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: MUTED, marginBottom: '12px' }}>
                {isHe ? '\u05d7\u05d9\u05e0\u05de\u05d9\u05ea' : 'Free'}
              </p>
              <p style={{ fontFamily: FRANK, fontSize: '36px', fontWeight: 700, color: TEXT, marginBottom: '24px' }}>
                {isHe ? '\u05d7\u05d9\u05e0\u05dd' : 'Free'}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(isHe
                  ? ['\u05d3\u05e3 \u05d1\u05d9\u05ea, \u05dc\u05d5\u05d7 \u05d9\u05e8\u05d7 \u05d5\u05d8\u05d9\u05e4 \u05d9\u05d5\u05de\u05d9',
                     '\u05db 20 \u05d4\u05d5\u05d3\u05e2\u05d5\u05ea \u05dc\u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5 \u05d1\u05d7\u05d5\u05d3\u05e9',
                     '\u05d2\u05d9\u05e0\u05d4 \u05d0\u05d7\u05ea, 10 \u05e6\u05de\u05d7\u05d9\u05dd']
                  : ['Home screen, moon calendar & daily tip',
                     '~20 Chupchu messages/month',
                     'One garden, 10 plants']
                ).map(item => (
                  <li key={item} style={{ fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: BIO_CYAN, flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pro plan */}
            <div style={{
              background: NIGHT_LIFT,
              border: `1px solid ${BIO_CYAN}30`,
              borderRadius: '20px', padding: '32px 28px',
              boxShadow: `0 0 40px rgba(0,229,195,0.06)`,
              position: 'relative',
            }}>
              <span style={{
                position: 'absolute', top: '-12px', insetInlineStart: '28px',
                background: BIO_CYAN, color: NIGHT,
                fontFamily: DM_SANS, fontSize: '11px', fontWeight: 700,
                padding: '3px 14px', borderRadius: '100px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {isHe ? '\u05de\u05d5\u05de\u05dc\u05e5' : 'Recommended'}
              </span>
              <p style={{ fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: BIO_CYAN, marginBottom: '12px' }}>
                Pro
              </p>
              <p style={{ fontFamily: FRANK, fontSize: '36px', fontWeight: 700, color: TEXT, marginBottom: '4px' }}>
                {isHe ? '18 \u20aa' : '₪18'}
              </p>
              <p style={{ fontFamily: DM_SANS, fontSize: '13px', color: MUTED, marginBottom: '24px' }}>
                {isHe ? '\u05dc\u05d7\u05d5\u05d3\u05e9' : '/month'}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(isHe
                  ? ['\u05db\u05dc \u05de\u05d4 \u05e9\u05d9\u05e9 \u05d1\u05ea\u05d5\u05db\u05e0\u05d9\u05ea \u05d4\u05d7\u05d9\u05e0\u05de\u05d9\u05ea',
                     '\u05e6\u0027\u05d5\u05e4\u05e6\u0027\u05d5 \u05dc\u05dc\u05d0 \u05d4\u05d2\u05d1\u05dc\u05d5\u05ea',
                     '\u05d2\u05d9\u05e0\u05d5\u05ea \u05d5\u05e6\u05de\u05d7\u05d9\u05dd \u05dc\u05dc\u05d0 \u05d2\u05d1\u05d5\u05dc',
                     '\u05d3\u05d5\u05d7\u05d5\u05ea \u05e6\u05de\u05d9\u05d7\u05d4 \u05de\u05ea\u05e7\u05d3\u05de\u05d9\u05dd',
                     '\u05ea\u05de\u05d9\u05db\u05d4 \u05e7\u05d3\u05d9\u05de\u05d4']
                  : ['Everything in free',
                     'Unlimited Chupchu messages',
                     'Unlimited gardens & plants',
                     'Advanced growth reports',
                     'Priority support']
                ).map(item => (
                  <li key={item} style={{ fontFamily: DM_SANS, fontSize: '14px', color: TEXT_MID, display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: BIO_CYAN, flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FAQ ═══════════════════════════════════════════════════════════════ */}
      <section style={{
        backgroundColor: NIGHT, padding: '80px 28px',
        borderBottom: '1px solid rgba(0,229,195,0.07)',
      }}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '52px' }}>
            <p style={{
              fontFamily: DM_SANS, fontSize: '10px', fontWeight: 700,
              letterSpacing: '0.22em', textTransform: 'uppercase',
              color: BIO_CYAN, marginBottom: '14px',
            }}>
              {isHe ? '\u05e9\u05d0\u05dc\u05d5\u05ea \u05e0\u05e4\u05d5\u05e6\u05d5\u05ea' : 'FAQ'}
            </p>
            <h2 style={{
              fontFamily: FRANK, fontWeight: 700,
              fontSize: 'clamp(22px, 3vw, 36px)', color: TEXT,
            }}>
              {isHe ? '\u05e9\u05d0\u05dc\u05d5\u05ea \u05d5\u05ea\u05e9\u05d5\u05d1\u05d5\u05ea' : 'Questions & Answers'}
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {faq.map(item => (
              <div key={item.q} style={{
                background: NIGHT_CARD, border: '1px solid rgba(0,229,195,0.08)',
                borderRadius: '14px', padding: '22px 24px',
              }}>
                <p style={{
                  fontFamily: FRANK, fontWeight: 700, fontSize: '16px',
                  color: TEXT, marginBottom: '10px',
                }}>
                  {item.q}
                </p>
                <p style={{
                  fontFamily: DM_SANS, fontSize: '14px',
                  color: TEXT_MID, lineHeight: 1.7,
                }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CLOSING CTA ═══════════════════════════════════════════════════════ */}
      <section style={{
        backgroundColor: NIGHT_MID, padding: '80px 28px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: '560px', margin: '0 auto' }}>
          <h2 style={{
            fontFamily: FRANK, fontWeight: 700,
            fontSize: 'clamp(26px, 4vw, 48px)', color: TEXT,
            lineHeight: 1.2, marginBottom: '16px',
          }}>
            {isHe
              ? <>\u05d4\u05d5\u05e8\u05d9\u05d3\u05d5 \u05e2\u05db\u05e9\u05d9\u05d5 — \u05d1\u05d7\u05d9\u05e0\u05dd</>
              : <>Download now — it's free</>
            }
          </h2>
          <p style={{
            fontFamily: DM_SANS, fontWeight: 300, fontSize: '16px',
            color: TEXT_MID, lineHeight: 1.7, marginBottom: '36px',
          }}>
            {isHe
              ? '\u05d0\u05dc\u05e4\u05d9 \u05d2\u05e0\u05e0\u05d9\u05dd \u05e2\u05d5\u05d1\u05d3\u05d9\u05dd \u05db\u05d1\u05e8 \u05e2\u05dd \u05d2\u05d9\u05e0\u05d4 \u05d7\u05d9\u05d4. \u05d4\u05e6\u05d8\u05e8\u05e4\u05d5.'
              : 'Thousands of gardeners already work with Gina Haya. Join them.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <PlayBadge source="app_page_footer" loading="lazy" />
          </div>
          <p style={{
            fontFamily: DM_SANS, fontSize: '12px', color: MUTED, marginTop: '16px',
          }}>
            {isHe
              ? <><bdi>Android</bdi> \u05d1\u05dc\u05d1\u05d3. \u05d2\u05e8\u05e1\u05ea iOS \u05d1\u05ea\u05db\u05e0\u05d5\u05df.</>
              : <>Android only. iOS coming soon.</>
            }
          </p>
        </div>

        <div style={{ marginTop: '48px' }}>
          <Link to="/" style={{
            fontFamily: DM_SANS, fontSize: '14px', color: MUTED,
            textDecoration: 'none', borderBottom: '1px solid rgba(107,144,128,0.3)',
            transition: 'color 0.2s, border-color 0.2s',
          }}
            onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = BIO_CYAN; el.style.borderColor = BIO_CYAN; }}
            onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = MUTED; el.style.borderColor = 'rgba(107,144,128,0.3)'; }}
          >
            {isHe ? '\u05d7\u05d6\u05e8\u05d5 \u05dc\u05d0\u05ea\u05e8' : 'Back to website'}
          </Link>
        </div>
      </section>
    </div>
  );
}
