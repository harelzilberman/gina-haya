import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { attachTier } from '../middleware/tierMiddleware';

export const gardenRouter: IRouter = Router();

// All garden routes require authentication + tier attachment
gardenRouter.use(verifyToken);
gardenRouter.use(attachTier);

// GET /api/garden — get all gardens for current user
gardenRouter.get('/', async (req: any, res) => {
  try {
    const { data, error } = await db
      .from('gardens')
      .select('*, garden_plants(*)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (err: any) {
    console.error('[GET /api/garden]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/garden — create a new garden
gardenRouter.post('/', async (req: any, res) => {
  try {
    const { name, locationRegion, soilType, plantIds = [] } = req.body;

    // Enforce per-tier garden limit
    const maxGardens = req.limits?.maxGardens ?? null;
    if (maxGardens !== null) {
      const { count } = await db
        .from('gardens')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', req.user.id);

      if ((count ?? 0) >= maxGardens) {
        return res.status(403).json({
          error: 'garden_limit_reached',
          message: 'הגעת למגבלת הגינות בתכנית שלך.',
          tier: req.tier,
          limit: maxGardens,
          current: count,
        });
      }
    }

    // Create the garden
    const { data: garden, error: gardenError } = await db
      .from('gardens')
      .insert({
        user_id: req.user.id,
        name: name || 'הגינה שלי',
        location_region: locationRegion || null,
        soil_type: soilType || null,
        notes: '',
      })
      .select()
      .single();

    if (gardenError) throw gardenError;

    // Add plants if provided
    if (plantIds.length > 0) {
      // Fetch plant details
      const { data: plants } = await db
        .from('plants')
        .select('id, common_name_he, common_name_en')
        .in('id', plantIds);

      if (plants && plants.length > 0) {
        const plantRows = plants.map((p: any) => ({
          garden_id: garden.id,
          plant_id: p.id,
          common_name_he: p.common_name_he,
          common_name_en: p.common_name_en,
        }));

        await db.from('garden_plants').insert(plantRows);
      }
    }

    res.status(201).json(garden);
  } catch (err: any) {
    console.error('[POST /api/garden]', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/garden/:id — update a garden
gardenRouter.patch('/:id', async (req: any, res) => {
  try {
    const { name, locationRegion, soilType, notes } = req.body;

    const { data, error } = await db
      .from('gardens')
      .update({
        ...(name && { name }),
        ...(locationRegion !== undefined && { location_region: locationRegion }),
        ...(soilType !== undefined && { soil_type: soilType }),
        ...(notes !== undefined && { notes }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err: any) {
    console.error('[PATCH /api/garden/:id]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/garden/:id/plants — add a plant to a garden
gardenRouter.post('/:id/plants', async (req: any, res) => {
  try {
    const { plantId, commonNameHe, commonNameEn, notes } = req.body;

    // Enforce per-tier plant-per-garden limit
    const maxPlants = req.limits?.maxPlantsPerGarden ?? null;
    if (maxPlants !== null) {
      const { count } = await db
        .from('garden_plants')
        .select('id', { count: 'exact', head: true })
        .eq('garden_id', req.params.id);

      if ((count ?? 0) >= maxPlants) {
        return res.status(403).json({
          error: 'plant_limit_reached',
          message: 'הגעת למגבלת הצמחים לגינה זו בתכנית שלך.',
          tier: req.tier,
          limit: maxPlants,
          current: count,
        });
      }
    }

    const { data, error } = await db
      .from('garden_plants')
      .insert({
        garden_id: req.params.id,
        plant_id: plantId,
        common_name_he: commonNameHe,
        common_name_en: commonNameEn,
        notes: notes || '',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('[POST /api/garden/:id/plants]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/garden/:id/plants/:plantId — remove a plant
gardenRouter.delete('/:id/plants/:plantId', async (req: any, res) => {
  try {
    const { error } = await db
      .from('garden_plants')
      .delete()
      .eq('garden_id', req.params.id)
      .eq('plant_id', req.params.plantId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/garden/:id/plants/:plantId]', err);
    res.status(500).json({ error: err.message });
  }
});
