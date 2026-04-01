import { Router, type IRouter } from 'express';
import { verifyToken } from '../middleware/auth';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';
import {
  getTasksForWeek, updateTaskStatus, createCustomTask,
  deleteTask, createTasksFromPlan
} from '../db/queries/tasks';

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

// POST /api/tasks/from-plan — create tasks from weekly plan
tasksRouter.post('/from-plan', async (req, res) => {
  try {
    const { planId, tasks } = req.body;
    if (!tasks || !Array.isArray(tasks)) return res.status(400).json({ error: 'tasks array required' });
    const created = await createTasksFromPlan(req.user!.id, planId ?? null, tasks);
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks — create custom task
tasksRouter.post('/', async (req, res) => {
  try {
    const { date, title, notes } = req.body;
    if (!date || !title) return res.status(400).json({ error: 'date and title required' });
    const task = await createCustomTask(req.user!.id, date, title, notes);
    res.json(task);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id — update status
tasksRouter.patch('/:id', async (req, res) => {
  try {
    const { status, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'status required' });
    const task = await updateTaskStatus(req.params.id, req.user!.id, status, notes);
    res.json(task);
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
