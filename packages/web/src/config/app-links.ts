export const PLAY_STORE_ID = 'com.ginahaya.gina_haya';

/**
 * Play Console only reads install attribution from a single `referrer`
 * param containing a URL-encoded UTM string. Top-level utm_* params are
 * ignored and installs report as organic. Do not "simplify" this.
 */
export function playStoreUrl(source: string): string {
  const params = new URLSearchParams({
    id: PLAY_STORE_ID,
    referrer: `utm_source=website&utm_medium=${source}`,
  });
  return `https://play.google.com/store/apps/details?${params.toString()}`;
}
