import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { createGarden, getGardensByUser, getGardenById } from '../db/queries/garden';

export const gardenRouter = Router();

gardenRouter.use(verifyToken);

const createGardenSchema = z.object({
  name: z.string().min(1).max(100).default('הגינה שלי'),
  locationRegion: z.string().max(100).default(''),
  soilType: z
    .enum(['clay', 'sandy', 'loam', 'chalky', 'silty', 'peaty', 'mixed'])
    .nullable()
    .optional(),
  plantIds: z.array(z.string().uuid()).optional(),
});

// ── POST /api/garden ────────────────────────────────────────────────────────

gardenRouter.post('/', async (req, res) => {
  const parsed = createGardenSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid request body', details: parsed.error.issues });
  }

  const { id: userId } = req.user!;
  const { name, locationRegion, soilType, plantIds } = parsed.data;

  try {
    const garden = await createGarden(userId, {
      name,
      locationRegion,
      soilType: soilType ?? null,
      notes: '',
    });

    // Associate plants if provided
    if (plantIds?.length) {
      const { data: plantsData } = await db
        .from('plants')
        .select('id, common_name_he, common_name_en')
        .in('id', plantIds);

      if (plantsData?.length) {
        await db.from('garden_plants').insert(
          plantsData.map((p) => ({
            garden_id: garden.id,
            plant_id: p.id,
            common_name_he: p.common_name_he,
            common_name_en: p.common_name_en,
          }))
        );
      }
    }

    const fullGarden = await getGardenById(garden.id, userId);
    return res.status(201).json(fullGarden);
  } catch (err) {
    console.error('[garden/create]', err);
    return res.status(500).json({ error: 'Failed to create garden' });
  }
});

// ── GET /api/garden ─────────────────────────────────────────────────────────

gardenRouter.get('/', async (req, res) => {
  const { id: userId } = req.user!;

  try {
    const gardens = await getGardensByUser(userId);
    return res.json(gardens);
  } catch (err) {
    console.error('[garden/list]', err);
    return res.status(500).json({ error: 'Failed to fetch gardens' });
  }
});
