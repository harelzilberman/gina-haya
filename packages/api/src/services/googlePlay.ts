import { google } from 'googleapis';

/**
 * Returns an authenticated Google androidpublisher v3 API client.
 * Parses GOOGLE_PLAY_SERVICE_ACCOUNT_JSON at call time (lazy).
 * Throws a 503-style error object if the env var is missing or malformed.
 */
export function getAndroidPublisherClient() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    const err: any = new Error('Google Play service account not configured');
    err.statusCode = 503;
    throw err;
  }

  let credentials: object;
  try {
    credentials = JSON.parse(raw);
  } catch {
    const err: any = new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not valid JSON');
    err.statusCode = 503;
    throw err;
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  });

  return google.androidpublisher({ version: 'v3', auth });
}
