-- Photos are now stored on device only. Remove all uploaded photos from storage.
-- The journal_photos table references are kept for now but storage bucket contents are cleared.
DELETE FROM storage.objects WHERE bucket_id = 'journal-photos';
