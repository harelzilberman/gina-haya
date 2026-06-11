import { Router, type IRouter } from 'express';
import { verifyToken } from '../middleware/auth';
import { ISRAEL_TIMEZONE } from '@gina-haya/shared';
import {
  getTasksForWeek, getTasksForRange, updateTaskStatus, updateTask,
  createCustomTask, deleteTask, createTasksFromPlan
} from '../db/queries/tasks';
import { sendSmartReminder } from '../services/cronJobs';
import { db } from '../db/client';

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
// Accepts { tasks: [...] } (client-built list) OR { planId: null } (server builds from stored plan)
tasksRouter.post('/from-plan', async (req, res) => {
  const userId = req.user!.id;
  console.log('[POST /api/tasks/from-plan] HIT — userId:', userId, 'body keys:', Object.keys(req.body));
  try {
    const { planId, tasks } = req.body;
    const today = todayISO();
    const weekEnd = (() => {
      const d = new Date(today + 'T00:00:00');
      d.setDate(d.getDate() + 6);
      return d.toISOString().slice(0, 10);
    })();

    let taskRows: Array<{ date: string; title: string; type: 'biodynamic' | 'maintenance' | 'custom'; source_action?: string }>;
    let resolvedPlanId: string | null = planId ?? null;

    if (Array.isArray(tasks) && tasks.length > 0) {
      // Legacy path: client sent a pre-built tasks array
      taskRows = tasks;
    } else {
      // Auto path: fetch the stored plan and synthesize tasks server-side
      const { data: planRow } = await db
        .from('planting_plans')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', today)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (!planRow) {
        console.log('[POST /api/tasks/from-plan] no plan found for today, returning empty');
        return res.json([]);
      }

      resolvedPlanId = planRow.id;

      // Avoid duplicates: if tasks already exist for this week, skip
      const existing = await getTasksForRange(userId, today, weekEnd);
      if (existing.length > 0) {
        console.log('[POST /api/tasks/from-plan] tasks already exist for week, skipping');
        return res.json(existing);
      }

      // Synthesize tasks from the stored plan_data
      const plan = planRow.plan_data;
      taskRows = [];

      for (const task of (plan.gardenTasks ?? [])) {
        taskRows.push({ date: plan.weekStart ?? today, title: String(task), type: 'maintenance', source_action: 'weekly_plan' });
      }
      for (const day of (plan.days ?? [])) {
        if (day.prep500) {
          taskRows.push({ date: day.date, title: 'הכנת פרפרט 500', type: 'biodynamic', source_action: 'prep500' });
        }
        if (day.prep501) {
          taskRows.push({ date: day.date, title: 'הכנת פרפרט 501', type: 'biodynamic', source_action: 'prep501' });
        }
        for (const action of (day.recommendedActions ?? []).slice(0, 2)) {
          taskRows.push({ date: day.date, title: String(action), type: 'maintenance', source_action: 'weekly_plan' });
        }
      }

      console.log('[POST /api/tasks/from-plan] synthesized', taskRows.length, 'tasks from plan', resolvedPlanId);
    }

    if (taskRows.length === 0) {
      console.log('[POST /api/tasks/from-plan] no tasks to create');
      return res.json([]);
    }

    const created = await createTasksFromPlan(userId, resolvedPlanId, taskRows);
    console.log('[POST /api/tasks/from-plan] inserted', created.length, 'rows');
    res.json(created);

    // Fire-and-forget smart reminder for biodynamic tasks today
    const todayTasks = created.filter((t: any) => t.date === today && t.type === 'biodynamic');
    if (todayTasks.length > 0) {
      sendSmartReminder(
        userId,
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
        user_id:       userId,
        plan_id:       null,
        date,
        title:         t.title,
        type:          'custom' as const,
        status:        'pending' as const,
        notes:         t.notes || null,
        category:      t.category || 'general',
        priority:      t.priority || 'medium',
        source_action: 'chupchu',
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
