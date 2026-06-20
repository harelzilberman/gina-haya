import { Router, type IRouter } from 'express';
import axios from 'axios';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_HEADERS = {
  'x-api-key': process.env.ANTHROPIC_API_KEY!,
  'anthropic-version': '2023-06-01',
  'content-type': 'application/json',
};

export const journalRouter: IRouter = Router();

journalRouter.use(verifyToken);
journalRouter.use(attachTier);

// ── POST /api/journal/entries ─────────────────────────────────────────────────
// Create a new journal entry
journalRouter.post('/entries', async (req: any, res) => {
  try {
    const { gardenId, plantId, actionType, note, isPublic, entryDate } = req.body;

    if (!actionType) {
      return res.status(400).json({ error: 'actionType is required' });
    }

    const { data, error } = await db
      .from('journal_entries')
      .insert({
        user_id:    req.user.id,
        garden_id:  gardenId || null,
        plant_id:   plantId  || null,
        action_type: actionType,
        note:       note     || null,
        is_public:  isPublic ?? false,
        entry_date: entryDate || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('[POST /api/journal/entries]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/journal/entries ──────────────────────────────────────────────────
// Get current user's journal entries (most recent first)
journalRouter.get('/entries', async (req: any, res) => {
  try {
    const { data: entries, error } = await db
      .from('journal_entries')
      .select('*, journal_photos(*)')
      .eq('user_id', req.user.id)
      .order('entry_date', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Generate signed URLs for all photos (bucket is private)
    await Promise.all(
      (entries || []).flatMap((entry: any) =>
        (entry.journal_photos || []).map(async (photo: any) => {
          const { data: signedData } = await db.storage
            .from('journal-photos')
            .createSignedUrl(photo.storage_path, 3600);
          photo.signed_url = signedData?.signedUrl ?? null;
        })
      )
    );

    res.json(entries || []);
  } catch (err: any) {
    console.error('[GET /api/journal/entries]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/journal/gallery ──────────────────────────────────────────────────
// Get public entries for the community gallery
journalRouter.get('/gallery', async (req: any, res) => {
  try {
    // Fetch public entries + their photos
    const { data: entries, error } = await db
      .from('journal_entries')
      .select(`id, action_type, note, entry_date, user_id, journal_photos(id, storage_path, caption)`)
      .eq('is_public', true)
      .order('entry_date', { ascending: false })
      .limit(40);

    if (error) throw error;

    // Fetch display names for the unique user_ids (public.users is separate from auth.users)
    const userIds = [...new Set((entries || []).map((e: any) => e.user_id))];
    let userMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: users } = await db
        .from('users')
        .select('id, display_name')
        .in('id', userIds);
      userMap = Object.fromEntries((users || []).map((u: any) => [u.id, u.display_name]));
    }

    const data = (entries || []).map((e: any) => ({
      ...e,
      display_name: userMap[e.user_id] || null,
    }));

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('[GET /api/journal/gallery]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/journal/photos ──────────────────────────────────────────────────
// Save a photo row after upload to Supabase Storage
journalRouter.post('/photos', async (req: any, res) => {
  try {
    const { entryId, storagePath, caption, sortOrder } = req.body;

    if (!entryId || !storagePath) {
      return res.status(400).json({ error: 'entryId and storagePath are required' });
    }

    const { data, error } = await db
      .from('journal_photos')
      .insert({
        entry_id:    entryId,
        storage_path: storagePath,
        caption:     caption    || null,
        sort_order:  sortOrder  ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('[POST /api/journal/photos]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/journal/photos/:id/identify ────────────────────────────────────
// Send photo to Claude Vision — identify plant, category, and target zone
journalRouter.post('/photos/:id/identify', async (req: any, res) => {
  try {
    const { id: photoId } = req.params;
    const userId = req.user.id;

    // 1. Load the photo row and verify ownership via the parent entry
    const { data: photo, error: photoError } = await db
      .from('journal_photos')
      .select('id, storage_path, entry_id, journal_entries!inner(user_id)')
      .eq('id', photoId)
      .single();

    if (photoError || !photo) {
      return res.status(404).json({ error: 'photo_not_found' });
    }

    const entryOwner = (photo as any).journal_entries?.user_id;
    if (entryOwner !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    // 2. Get a 60-second signed URL from Supabase Storage
    const { data: signedData, error: signedError } = await db
      .storage
      .from('journal-photos')
      .createSignedUrl(photo.storage_path, 60);

    if (signedError || !signedData?.signedUrl) {
      return res.status(500).json({ error: 'Could not access image' });
    }

    // 3. Fetch image and convert to base64
    const imgRes  = await fetch(signedData.signedUrl);
    const buffer  = await imgRes.arrayBuffer();
    const base64  = Buffer.from(buffer).toString('base64');
    const mime    = (imgRes.headers.get('content-type') || 'image/jpeg') as
                    'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

    // 4. Call Claude Vision — one call returns everything we need
    const aiRes = (await axios.post(ANTHROPIC_URL, {
      model:      'claude-haiku-4-5-20251001',   // Haiku is fast + cheap for vision tasks
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type:   'image',
            source: { type: 'base64', media_type: mime, data: base64 },
          },
          {
            type: 'text',
            text: `אתה מזהה צמחים בגינה ביתית. בדוק את התמונה והחזר JSON בלבד, ללא טקסט נוסף לפני או אחרי.

החזר בפורמט הזה בדיוק:
{
  "is_plant": true,
  "name_he": "שם הצמח בעברית",
  "name_en": "plant name in English",
  "category": "vegetable|herb|fruit|flower|other",
  "confidence": "high|medium|low",
  "zone_id": "grow-bed|herb-garden|general"
}

כללי שיוך לאזורים:
- ירקות (עגבנייה, מלפפון, חסה, גזר, קישוא, פלפל, חציל וכד') → zone_id: "grow-bed", category: "vegetable"
- עשבי תיבול (בזיליקום, נענע, פטרוזיליה, שמיר, רוזמרין, אורגנו, תימין, מרווה וכד') → zone_id: "herb-garden", category: "herb"
- עצי פרי, פירות (תפוח, אגס, לימון, תאנה וכד') → zone_id: "general", category: "fruit"
- פרחים → zone_id: "general", category: "flower"
- כל השאר → zone_id: "general", category: "other"

אם אין צמח בתמונה, החזר: {"is_plant": false, "name_he": "", "name_en": "", "category": "other", "confidence": "high", "zone_id": "general"}`,
          },
        ],
      }],
    }, { headers: ANTHROPIC_HEADERS, timeout: 30000 })).data;

    // 5. Parse the JSON response
    const raw     = aiRes.content[0].type === 'text' ? aiRes.content[0].text : '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    let identification: any;

    try {
      identification = JSON.parse(cleaned);
    } catch {
      return res.status(422).json({ error: 'Could not parse plant identification' });
    }

    // 6. Save identification result to journal_photos
    if (identification.is_plant) {
      await db
        .from('journal_photos')
        .update({
          identified_name_he:        identification.name_he,
          identified_name_en:        identification.name_en,
          identified_category:       identification.category,
          identification_confidence: identification.confidence,
          identification_zone_id:    identification.zone_id,
        })
        .eq('id', photoId);
    }

    res.json({ identification });
  } catch (err: any) {
    console.error('[POST /api/journal/photos/:id/identify]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/journal/photos/:id/confirm ─────────────────────────────────────
// User confirmed (or corrected) the identification — place plant on map
journalRouter.post('/photos/:id/confirm', async (req: any, res) => {
  try {
    const { id: photoId } = req.params;
    const userId = req.user.id;
    const {
      confirmedNameHe,
      confirmedNameEn,
      confirmedCategory,
      zoneId,
    }: {
      confirmedNameHe: string;
      confirmedNameEn: string;
      confirmedCategory: string;
      zoneId: 'grow-bed' | 'herb-garden' | 'general';
    } = req.body;

    if (!confirmedNameHe || !zoneId) {
      return res.status(400).json({ error: 'confirmedNameHe and zoneId are required' });
    }

    // 1. Mark photo as confirmed
    await db
      .from('journal_photos')
      .update({ identification_confirmed: true })
      .eq('id', photoId);

    // 2. Find or auto-create the user's "גינה משפחתית" default map
    let { data: mapRow } = await db
      .from('garden_maps')
      .select('id, map_data')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (!mapRow) {
      // Create a fresh map with the "גינה משפחתית" template zones
      const freshMapData = {
        objects: [
          // Grow bed zone object
          {
            id:        'zone-grow-bed',
            type:      'bed',
            label:     'ערוגת גידול',
            zone_id:   'grow-bed',
            x: 40,  y: 60,  width: 300, height: 220,
          },
          // Herb garden zone object
          {
            id:        'zone-herb-garden',
            type:      'bed',
            label:     'גינת עשבים',
            zone_id:   'herb-garden',
            x: 360, y: 60,  width: 200, height: 200,
          },
        ],
        plants: [],
      };

      const { data: newMap, error: mapError } = await db
        .from('garden_maps')
        .insert({
          user_id:    userId,
          name:       'גינה משפחתית',
          map_data:   freshMapData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (mapError) throw mapError;
      mapRow = newMap;
    }

    // 3. Compute plant position inside the target zone
    //    Grid cell = 56x56px with 8px padding inside the zone
    const CELL = 56;
    const PAD  = 16;
    const ZONE_DIMS: Record<string, { x: number; y: number; width: number; cols: number }> = {
      'grow-bed':    { x: 40,  y: 60,  width: 300, cols: 4 },
      'herb-garden': { x: 360, y: 60,  width: 200, cols: 3 },
      'general':     { x: 40,  y: 300, width: 520, cols: 6 },
    };

    const mapData = mapRow.map_data as { objects: any[]; plants: any[] };
    const existingInZone = (mapData.plants || []).filter(
      (p: any) => p.zone_id === zoneId
    ).length;

    const zoneDim  = ZONE_DIMS[zoneId] ?? ZONE_DIMS['general'];
    const col      = existingInZone % zoneDim.cols;
    const row      = Math.floor(existingInZone / zoneDim.cols);
    const plantX   = zoneDim.x + PAD + col * CELL;
    const plantY   = zoneDim.y + PAD + row * CELL;

    // 4. Add plant to map_data.plants array
    const newPlant = {
      id:          crypto.randomUUID(),
      plantNameHe: confirmedNameHe,
      plantNameEn: confirmedNameEn,
      category:    confirmedCategory,
      zone_id:     zoneId,
      photo_id:    photoId,
      x:           plantX,
      y:           plantY,
      addedAt:     new Date().toISOString(),
    };

    const updatedPlants = [...(mapData.plants || []), newPlant];

    await db
      .from('garden_maps')
      .update({
        map_data:   { ...mapData, plants: updatedPlants },
        updated_at: new Date().toISOString(),
      })
      .eq('id', mapRow.id);

    // 5. Also upsert a garden_plants row so the garden panel reflects it
    //    Find the garden linked to this map (if any)
    const { data: garden } = await db
      .from('gardens')
      .select('id')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    if (garden) {
      await db.from('garden_plants').insert({
        garden_id:      garden.id,
        common_name_he: confirmedNameHe,
        common_name_en: confirmedNameEn,
        notes:          `נוסף אוטומטית על ידי צ'ופצ'ו`,
      });
    }

    const zoneLabel: Record<string, string> = {
      'grow-bed':    'ערוגת הגידול',
      'herb-garden': 'גינת העשבים',
      'general':     'הגינה',
    };

    res.json({
      success:    true,
      plant:      newPlant,
      map_id:     mapRow.id,
      zone_label: zoneLabel[zoneId] ?? 'הגינה',
    });
  } catch (err: any) {
    console.error('[POST /api/journal/photos/:id/confirm]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/journal/entries/:id ───────────────────────────────────────────
// Update is_public or note on an entry
journalRouter.patch('/entries/:id', async (req: any, res) => {
  try {
    const { isPublic, note } = req.body;

    const { data, error } = await db
      .from('journal_entries')
      .update({
        ...(isPublic !== undefined && { is_public: isPublic }),
        ...(note     !== undefined && { note }),
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[PATCH /api/journal/entries/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/journal/entries/:id ──────────────────────────────────────────
journalRouter.delete('/entries/:id', async (req: any, res) => {
  try {
    const { error } = await db
      .from('journal_entries')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/journal/entries/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});
