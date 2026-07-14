/**
 * Photo-path guard — ensures that photo_path values are always Supabase
 * storage keys (relative paths) and never local device URIs.
 *
 * A Supabase storage key is a relative path with no leading slash and no
 * URL scheme, e.g. "<user_id>/chupchu/<timestamp>.jpg".
 * Local-device paths (file://, content://, absolute /data/... etc.)
 * must never be persisted — they are only readable on the originating
 * device and break the cross-platform signed-URL display flow.
 *
 * Call assertStorageKey() before any INSERT / UPDATE to plant_timeline or
 * plant_tracker_checkins, on both the API side and any future client that
 * writes photo_path directly.
 */

/** Patterns that unambiguously identify a local device path. */
const LOCAL_PATH_PATTERNS = [
  /^file:\/\//i,    // iOS / Android file:// URI
  /^content:\/\//i, // Android content:// provider URI
  /^\/data\//,      // Android internal storage (/data/user/0/...)
  /^\/storage\//,   // Android external storage (/storage/emulated/...)
  /^\/var\//,       // iOS simulator temp dir
  /^\/private\//,   // iOS device (/private/var/mobile/...)
  /^\/Users\//,     // macOS / iOS Simulator home directory
] as const;

/**
 * Returns true if `photoPath` looks like a local device URI rather than a
 * Supabase storage key.
 */
export function isLocalPhotoPath(photoPath: string): boolean {
  return LOCAL_PATH_PATTERNS.some(pattern => pattern.test(photoPath));
}

/**
 * Throws if `photoPath` is a local device URI.
 *
 * @param photoPath  The path value about to be persisted.
 * @param field      Column/field name to include in the error message.
 */
export function assertStorageKey(photoPath: string, field = 'photo_path'): void {
  if (isLocalPhotoPath(photoPath)) {
    throw new Error(
      `${field} must be a Supabase storage key (e.g. "<user_id>/chupchu/<timestamp>.jpg"), ` +
      `not a local device path: "${photoPath}". ` +
      'Upload the image bytes to storage first and persist only the returned key.'
    );
  }
}
