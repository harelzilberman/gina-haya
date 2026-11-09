#!/usr/bin/env node
// Generates packages/web/public/sitemap.xml from the static public routes
// and packages/shared/data/articles.json. Re-run after adding articles:
//   pnpm sitemap
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES_JSON = resolve(ROOT, 'packages/shared/data/articles.json');
const OUT = resolve(ROOT, 'packages/web/public/sitemap.xml');

const BASE_URL = 'https://www.gina-haya.com';

// Public routes from packages/web/src/App.tsx (no ProtectedRoute).
// /calendar is behind ProtectedRoute, so it is intentionally not listed.
const STATIC_PAGES = [
  { path: '/',         changefreq: 'weekly',  priority: '1.0' },
  { path: '/about',    changefreq: 'monthly', priority: '0.6' },
  { path: '/plants',   changefreq: 'monthly', priority: '0.8' },
  { path: '/articles', changefreq: 'weekly',  priority: '0.8' },
  { path: '/guides',   changefreq: 'monthly', priority: '0.7' },
  { path: '/app',      changefreq: 'monthly', priority: '0.7' },
  { path: '/chupchu',  changefreq: 'monthly', priority: '0.7' },
  { path: '/pricing',  changefreq: 'monthly', priority: '0.6' },
  { path: '/help',     changefreq: 'monthly', priority: '0.5' },
  { path: '/privacy',  changefreq: 'yearly',  priority: '0.3' },
];

const today = new Date().toISOString().slice(0, 10);

const escapeXml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
   .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const toDate = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid publishedAt: ${value}`);
  return d.toISOString().slice(0, 10);
};

const articles = JSON.parse(readFileSync(ARTICLES_JSON, 'utf8'))
  .filter((a) => !a.comingSoon)
  .map((a) => ({
    // Same URL scheme as ArticlesPage.tsx: navigate(`/articles/${article.id}`)
    path: `/articles/${encodeURIComponent(a.id)}`,
    lastmod: a.publishedAt ? toDate(a.publishedAt) : today,
    changefreq: 'monthly',
    priority: '0.7',
  }));

const urls = [
  ...STATIC_PAGES.map((p) => ({ ...p, lastmod: today })),
  ...articles,
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => [
    '  <url>',
    `    <loc>${escapeXml(BASE_URL + u.path)}</loc>`,
    `    <lastmod>${u.lastmod}</lastmod>`,
    `    <changefreq>${u.changefreq}</changefreq>`,
    `    <priority>${u.priority}</priority>`,
    '  </url>',
  ].join('\n')),
  '</urlset>',
  '',
].join('\n');

writeFileSync(OUT, xml, 'utf8');
console.log(`Wrote ${urls.length} URLs (${articles.length} articles) to ${OUT}`);
