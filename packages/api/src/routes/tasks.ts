import { Router, type IRouter } from 'express';
import { verifyToken } from '../middleware/auth';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';
import {
  getTasksForWeek, getTasksForRange, updateTaskStatus, updateTask,
  createCustomTask, deleteTask,
} from '../db/queries/tasks';
import { db } from '../db/client';

export const tasksRouter: IRouter = Router();
tasksRouter.use(verifyToken);

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE });
}

// GET /api/tasks/week — get this week's tasks
// ?include_archived=true — include tasks linked to archived plants (for Passport view)
tasksRouter.get('/week', async (req, res) => {
  try {
    const today = todayISO();
    const end = new Date(today + 'T00:00:00');
    end.setDate(end.getDate() + 6);
    const includeArchived = req.query.include_archived === 'true';
    const tasks = await getTasksForWeek(req.user!.id, today, end.toISOString().slice(0, 10), includeArchived);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/range — get tasks for a date range
// ?include_archived=true — include tasks linked to archived plants (for Passport view)
tasksRouter.get('/range', async (req, res) => {
  try {
    const { from, to, include_archived } = req.query as { from?: string; to?: string; include_archived?: string };
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const includeArchived = include_archived === 'true';
    const tasks = await getTasksForRange(req.user!.id, from, to, includeArchived);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create custom task
tasksRouter.post('/', async (req, res) => {
  try {
    const { date, title, notes, source_action, plant_name, garden_plants_id } = req.body;
    if (!date || !title) return res.status(400).json({ error: 'date and title required' });
    const task = await createCustomTask(req.user!.id, date, title, notes, source_action, plant_name, garden_plants_id);
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — update task (status, notes, date, title, plant_name)
tasksRouter.patch('/:id', async (req, res) => {
  try {
    const { status, notes, date, title, plant_name } = req.body;
    if (status || date || title !== undefined || plant_name !== undefined) {
      const task = await updateTask(req.params.id, req.user!.id, { status, notes: notes ?? undefined, date, title, plant_name });
      return res.json(task);
    }
    return res.status(400).json({ error: 'at least one field required' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tasks/:id
tasksRouter.delete('/:id', async (req, res) => {
  try {
    await deleteTask(req.params.id, req.user!.id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/bulk — create multiple tasks (from Chupchu proposals)
tasksRouter.post('/bulk', async (req, res) => {
  try {
    const { tasks } = req.body as {
      tasks: Array<{
        title: string;
        notes: string;
        date: string;
        category: string;
        priority: string;
      }>;
    };

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks array required' });
    }

    const userId = req.user!.id;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const rows = tasks.map(t => {
      // Strip time part; fall back to tomorrow if date is missing or invalid
      let date = (t.date ?? '').toString().split('T')[0].split(' ')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = tomorrowStr;
      return {
        user_id:          userId,
        plan_id:          null,
        date,
        title:            t.title,
        type:             'custom' as const,
        status:           'pending' as const,
        notes:            t.notes || null,
        plant_name:       (t as any).plant_name || null,
        garden_plants_id: (t as any).garden_plants_id || null,
        category:         t.category || 'general',
        priority:         t.priority || 'medium',
        source_action:    'chupchu',
      };
    });

    const { data, error } = await db
      .from('garden_tasks')
      .insert(rows)
      .select();

    if (error) throw error;
    res.json({ ok: true, count: data?.length ?? 0, tasks: data });
  } catch (err: any) {
    console.error('[POST /api/tasks/bulk]', err.message);
    res.status(500).json({ error: err.message });
  }
});
