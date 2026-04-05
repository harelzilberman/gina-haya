import { Router, type IRouter } from 'express';
import { verifyToken } from '../middleware/auth';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';
import {
  getTasksForWeek, getTasksForRange, updateTaskStatus, updateTask,
  createCustomTask, deleteTask, createTasksFromPlan
} from '../db/queries/tasks';
import { sendSmartReminder } from '../services/cronJobs';

export const tasksRouter: IRouter = Router();
tasksRouter.use(verifyToken);

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: ISRAEL_TIMEZONE });
}

// GET /api/tasks/week — get this week's tasks
tasksRouter.get('/week', async (req, res) => {
  try {
    const today = todayISO();
    const end = new Date(today + 'T00:00:00');
    end.setDate(end.getDate() + 6);
    const tasks = await getTasksForWeek(req.user!.id, today, end.toISOString().slice(0, 10));
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/tasks/range — get tasks for a date range
tasksRouter.get('/range', async (req, res) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    if (!from || !to) return res.status(400).json({ error: 'from and to required' });
    const tasks = await getTasksForRange(req.user!.id, from, to);
    res.json(tasks);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/from-plan — create tasks from weekly plan
tasksRouter.post('/from-plan', async (req, res) => {
  console.log('[POST /api/tasks/from-plan] HIT — userId:', req.user?.id, 'body keys:', Object.keys(req.body));
  try {
    const { planId, tasks } = req.body;
    console.log('[POST /api/tasks/from-plan] planId:', planId, 'tasks count:', Array.isArray(tasks) ? tasks.length : 'NOT_ARRAY', 'sample:', JSON.stringify(tasks?.[0]));
    if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: 'tasks array required' });
    const created = await createTasksFromPlan(req.user!.id, planId ?? null, tasks);
    console.log('[POST /api/tasks/from-plan] Supabase insert succeeded, rows created:', created.length);
    res.json(created);

    // Fire-and-forget smart reminder if there are biodynamic tasks today
    const todayTasks = created.filter((t: any) => t.date === todayISO() && t.type === 'biodynamic');
    if (todayTasks.length > 0) {
      sendSmartReminder(
        req.user!.id,
        `יש לך ${todayTasks.length} משימות ביודינמיות היום: ${todayTasks[0].title}`
      ).catch(() => {});
    }
  } catch (err: any) {
    console.error('[POST /api/tasks/from-plan] ERROR:', err.message, err.code, err.details);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create custom task
tasksRouter.post('/', async (req, res) => {
  try {
    const { date, title, notes, source_action } = req.body;
    if (!date || !title) return res.status(400).json({ error: 'date and title required' });
    const task = await createCustomTask(req.user!.id, date, title, notes, source_action);
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — update task (status, notes, date, title)
tasksRouter.patch('/:id', async (req, res) => {
  try {
    const { status, notes, date, title } = req.body;
    if (status || date || title !== undefined) {
      const task = await updateTask(req.params.id, req.user!.id, { status, notes: notes ?? undefined, date, title });
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
