/**
 * Guard tests for isLocalPhotoPath / assertStorageKey.
 * Run with: npx tsx packages/shared/__tests__/photoPath.test.ts
 * No test framework dependency — uses Node's built-in assert module.
 */
import assert from 'assert';
import { isLocalPhotoPath, assertStorageKey } from '../src/utils/photoPath';

// ── Local paths that must be REJECTED ────────────────────────────────────────
const LOCAL_PATHS = [
  // Android file:// URIs
  'file:///storage/emulated/0/DCIM/Camera/IMG_20240714.jpg',
  'file:///data/user/0/com.ginahoma.app/cache/photo.jpg',
  // iOS file:// URI
  'file:///var/mobile/Containers/Data/Application/uuid/tmp/photo.jpg',
  // Android content:// provider
  'content://media/external/images/media/1234',
  // Absolute Android paths
  '/data/user/0/com.ginahoma.app/cache/photo.jpg',
  '/storage/emulated/0/DCIM/Camera/IMG_20240714.jpg',
  // iOS absolute paths
  '/var/mobile/Media/photo.jpg',
  '/private/var/mobile/Containers/Data/Application/uuid/tmp/photo.jpg',
  // macOS / iOS Simulator
  '/Users/harel/Library/Developer/CoreSimulator/photo.jpg',
];

// ── Supabase storage keys that must PASS ─────────────────────────────────────
const STORAGE_KEYS = [
  '847722c1-fd94-4f29-a79f-f7bfd93cd0bf/chupchu/1720000000000.jpg',
  '847722c1-fd94-4f29-a79f-f7bfd93cd0bf/c4e52797-2130-4758-b9cf-18a41a97b17b/1720000000000.jpg',
  'user-id/tracker-id/photo.jpg',
  'abc123/chupchu/1234567890.jpg',
];

let passed = 0;

// Local paths must be flagged and cause assertStorageKey to throw
for (const path of LOCAL_PATHS) {
  assert.strictEqual(
    isLocalPhotoPath(path), true,
    `isLocalPhotoPath should return true for local path: "${path}"`
  );
  assert.throws(
    () => assertStorageKey(path),
    /local device path/,
    `assertStorageKey should throw for local path: "${path}"`
  );
  passed += 2;
}

// Storage keys must pass through cleanly
for (const key of STORAGE_KEYS) {
  assert.strictEqual(
    isLocalPhotoPath(key), false,
    `isLocalPhotoPath should return false for storage key: "${key}"`
  );
  assert.doesNotThrow(
    () => assertStorageKey(key),
    `assertStorageKey should not throw for storage key: "${key}"`
  );
  passed += 2;
}

console.log(`✓ photoPath guard: ${passed} assertions passed`);
