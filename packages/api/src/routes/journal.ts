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

// ── POST /api/journal/photos/:id/identify ────────────────────────────────────
// Send photo to Claude Vision — identify plant, category, and target zone.
// Called by ChupChu's photo upload → identify → confirm flow.
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
// User confirmed (or corrected) the identification — place plant on map.
// Called by ChupChu's PlantConfirmBubble after the user approves the AI result.
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

    // Verify ownership via the parent journal entry
    const { data: photo, error: photoError } = await db
      .from('journal_photos')
      .select('id, journal_entries!inner(user_id)')
      .eq('id', photoId)
      .maybeSingle();
    if (photoError || !photo) {
      return res.status(404).json({ error: 'photo_not_found' });
    }
    const entryOwner = (photo as any).journal_entries?.user_id;
    if (entryOwner !== userId) {
      console.warn('[POST /journal/photos/:id/confirm] ownership check failed', { photoId, userId });
      return res.status(403).json({ error: 'forbidden' });
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
        common_name_en: confirmedNameEn || null,
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
