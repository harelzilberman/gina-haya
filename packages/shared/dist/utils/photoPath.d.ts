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
/**
 * Returns true if `photoPath` looks like a local device URI rather than a
 * Supabase storage key.
 */
export declare function isLocalPhotoPath(photoPath: string): boolean;
/**
 * Throws if `photoPath` is a local device URI.
 *
 * @param photoPath  The path value about to be persisted.
 * @param field      Column/field name to include in the error message.
 */
export declare function assertStorageKey(photoPath: string, field?: string): void;
//# sourceMappingURL=photoPath.d.ts.map