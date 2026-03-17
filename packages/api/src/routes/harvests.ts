import 'dotenv/config';
import { Router, type IRouter } from 'express';
import { db } from '../db/client';
import { verifyToken } from '../middleware/auth';
import { todayInIsrael } from '@gina-haya/shared';

export const harvestsRouter: IRouter = Router();

harvestsRouter.use(verifyToken);

// GET /api/harvests
harvestsRouter.get('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const limit  = parseInt(String(req.query.limit  ?? 20), 10);
    const offset = parseInt(String(req.query.offset ?? 0),  10);
    const month  = req.query.month as string | undefined; // YYYY-MM

    let query = db
      .from('harvests')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('harvest_date', { ascending: false })
      .range(offset, offset + limit - 1);

    if (month) {
      const start = `${month}-01`;
      const end   = `${month}-31`;
      query = query.gte('harvest_date', start).lte('harvest_date', end);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    res.json({ harvests: data ?? [], total: count ?? 0 });
  } catch (err: any) {
    console.error('[GET /api/harvests]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/harvests/stats
harvestsRouter.get('/stats', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const now    = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const lastMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);

    const { data: all, error } = await db
      .from('harvests')
      .select('plant_name_he, plant_name_en, harvest_date, day_type')
      .eq('user_id', userId)
      .order('harvest_date', { ascending: false });

    if (error) throw error;
    const rows = all ?? [];

    const totalHarvests = rows.length;
    const thisMonth = rows.filter(r => r.harvest_date >= thisMonthStart).length;
    const lastMonth = rows.filter(r => r.harvest_date >= lastMonthStart && r.harvest_date <= lastMonthEnd).length;

    // Top 5 plants
    const plantCounts: Record<string, { nameHe: string; nameEn: string; count: number }> = {};
    for (const r of rows) {
      const key = r.plant_name_he;
      if (!plantCounts[key]) plantCounts[key] = { nameHe: r.plant_name_he, nameEn: r.plant_name_en, count: 0 };
      plantCounts[key].count++;
    }
    const topPlants = Object.values(plantCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // By day type
    const byDayType = { fruit: 0, root: 0, flower: 0, leaf: 0 } as Record<string, number>;
    for (const r of rows) {
      if (r.day_type && r.day_type in byDayType) byDayType[r.day_type]++;
    }

    // Recent streak: consecutive days with at least one harvest (counting back from today)
    const harvestDates = new Set(rows.map(r => r.harvest_date));
    let streak = 0;
    const today = todayInIsrael();
    const check = new Date(today + 'T12:00:00');
    while (harvestDates.has(check.toISOString().slice(0, 10))) {
      streak++;
      check.setDate(check.getDate() - 1);
    }

    res.json({ totalHarvests, thisMonth, lastMonth, topPlants, byDayType, recentStreak: streak });
  } catch (err: any) {
    console.error('[GET /api/harvests/stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/harvests
harvestsRouter.post('/', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const {
      plantNameHe, plantNameEn, plantId, gardenId,
      harvestDate, quantityGrams, quantityUnits, quantityType,
      notes, dayType, plantingScore,
    } = req.body;

    if (!plantNameHe || !plantNameEn) {
      return res.status(400).json({ error: 'plantNameHe and plantNameEn are required' });
    }

    // Auto-fetch calendar data if not provided
    let resolvedDayType     = dayType     ?? null;
    let resolvedScore       = plantingScore ?? null;
    if (!resolvedDayType || !resolvedScore) {
      const today = harvestDate ?? todayInIsrael();
      const { data: cal } = await db
        .from('biodynamic_calendar')
        .select('day_type, planting_score')
        .eq('date', today)
        .single();
      if (cal) {
        resolvedDayType = resolvedDayType ?? cal.day_type;
        resolvedScore   = resolvedScore   ?? cal.planting_score;
      }
    }

    const { data, error } = await db
      .from('harvests')
      .insert({
        user_id:        userId,
        garden_id:      gardenId      ?? null,
        plant_id:       plantId       ?? null,
        plant_name_he:  plantNameHe,
        plant_name_en:  plantNameEn,
        harvest_date:   harvestDate   ?? todayInIsrael(),
        quantity_grams: quantityGrams ?? null,
        quantity_units: quantityUnits ?? null,
        quantity_type:  quantityType  ?? 'units',
        notes:          notes         ?? null,
        day_type:       resolvedDayType,
        planting_score: resolvedScore,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err: any) {
    console.error('[POST /api/harvests]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/harvests/:id
harvestsRouter.delete('/:id', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id }  = req.params;

    const { error } = await db
      .from('harvests')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE /api/harvests/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});
