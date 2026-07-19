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
//
// Optional body field: source_timeline_id (UUID)
//   When provided:
//   • Written on every inserted row — links tasks back to the diagnosis entry.
//   • Migration 032 adds a partial unique index (user_id, source_timeline_id, title)
//     so the same diagnosis cannot produce duplicate rows even on retries.
//   • On DB unique-violation (23505): falls back to per-row inserts; conflicting
//     rows counted as skipped_existing rather than erroring.
//   • After any successful insert(s): sets plant_timeline.content.tasks_added = true
//     on the source entry (ownership-checked, non-fatal on failure).
//
// Requests without source_timeline_id behave exactly as before.
tasksRouter.post('/bulk', async (req, res) => {
  try {
    const { tasks, source_timeline_id } = req.body as {
      tasks: Array<{
        title: string;
        notes: string;
        date: string;
        category: string;
        priority: string;
      }>;
      source_timeline_id?: string;
    };

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'tasks array required' });
    }

    const userId = req.user!.id;

    // Normalise and validate source_timeline_id — must be a non-empty string if
    // present; anything else is silently ignored so old clients keep working.
    const sourceId: string | null =
      source_timeline_id && typeof source_timeline_id === 'string'
        ? source_timeline_id.trim() || null
        : null;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const rows = tasks.map(t => {
      // Strip time part; fall back to tomorrow if date is missing or invalid
      let date = (t.date ?? '').toString().split('T')[0].split(' ')[0];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) date = tomorrowStr;
      return {
        user_id:            userId,
        plan_id:            null,
        date,
        title:              t.title,
        type:               'custom' as const,
        status:             'pending' as const,
        notes:              t.notes || null,
        plant_name:         (t as any).plant_name || null,
        garden_plants_id:   (t as any).garden_plants_id || null,
        category:           t.category || 'general',
        priority:           t.priority || 'medium',
        source_action:      'chupchu',
        source_timeline_id: sourceId,  // null for requests without a source
      };
    });

    // ── Pre-insert dedup guard ───────────────────────────────────────────────
    // Mirrors the pattern in garden.ts starter-tasks endpoint (line ~549).
    // Only status='pending' rows block re-add — completed/skipped tasks leave
    // the pending set and can legitimately be re-added (e.g. recurring care).
    // Match key:
    //   • row has garden_plants_id set  → (user_id, garden_plants_id, title)
    //   • row has null garden_plants_id → (user_id, title, date)  [fallback]
    // On guard-query failure: log and fall through to insert (availability > dedup).
    let existingRows: Array<{ title: string; garden_plants_id: string | null; date: string }> = [];
    try {
      const { data: existing, error: guardError } = await db
        .from('garden_tasks')
        .select('title, garden_plants_id, date')
        .eq('user_id', userId)
        .eq('status', 'pending');
      if (guardError) {
        console.error('[POST /api/tasks/bulk] dedup guard query failed, inserting without dedup:', guardError.message);
      } else {
        existingRows = existing ?? [];
      }
    } catch (guardErr: any) {
      console.error('[POST /api/tasks/bulk] dedup guard threw, inserting without dedup:', guardErr.message);
    }

    // Build lookup sets for O(1) matching
    const pendingWithPlant  = new Set(
      existingRows
        .filter(r => r.garden_plants_id != null)
        .map(r => `${r.garden_plants_id}::${r.title}`)
    );
    const pendingWithoutPlant = new Set(
      existingRows
        .filter(r => r.garden_plants_id == null)
        .map(r => `${r.title}::${r.date}`)
    );

    const existingMatched: typeof existingRows = [];
    const newRows = rows.filter(r => {
      if (r.garden_plants_id != null) {
        const key = `${r.garden_plants_id}::${r.title}`;
        if (pendingWithPlant.has(key)) { existingMatched.push(r); return false; }
      } else {
        const key = `${r.title}::${r.date}`;
        if (pendingWithoutPlant.has(key)) { existingMatched.push(r); return false; }
      }
      return true;
    });

    // All-duplicates: valid — return 200 with zero inserts
    if (newRows.length === 0) {
      return res.json({
        ok:               true,
        count:            0,
        tasks:            [],
        skipped_existing: existingMatched.length,
      });
    }

    // ── Batch insert ──────────────────────────────────────────────────────────
    let insertedTasks: any[] = [];
    let dbSkipped = 0;

    const { data, error } = await db
      .from('garden_tasks')
      .insert(newRows)
      .select();

    if (error) {
      // Unique-violation from the partial index (uq_garden_tasks_source, migration 032):
      // the source_timeline_id + title pair already exists for this user.  Fall back to
      // per-row inserts so we can separate successes from conflicts without a 500.
      if (error.code === '23505') {
        console.log('[POST /api/tasks/bulk] unique violation on batch — falling back to per-row inserts');
        for (const row of newRows) {
          const { data: singleData, error: singleErr } = await db
            .from('garden_tasks')
            .insert(row)
            .select()
            .single();
          if (singleErr) {
            if (singleErr.code === '23505') {
              dbSkipped++;
            } else {
              // Unexpected error on a single row — propagate as 500
              console.error('[POST /api/tasks/bulk] per-row insert failed:', singleErr.message);
              throw singleErr;
            }
          } else if (singleData) {
            insertedTasks.push(singleData);
          }
        }
      } else {
        throw error;
      }
    } else {
      insertedTasks = data ?? [];
    }

    // ── Set tasks_added flag on the source timeline entry ─────────────────────
    // Chosen variant: bulk endpoint sets the flag — one round-trip, no separate
    // PATCH endpoint needed, and the client already owns the source_timeline_id.
    // Only runs when we have a source and actually inserted at least one task.
    // Ownership enforced via user_id filter on both read and write.
    // Non-fatal: a failure here does not roll back the task inserts.
    if (sourceId && insertedTasks.length > 0) {
      try {
        const { data: entry, error: readErr } = await db
          .from('plant_timeline')
          .select('content')
          .eq('id', sourceId)
          .eq('user_id', userId)
          .single();

        if (readErr || !entry) {
          console.warn('[POST /api/tasks/bulk] tasks_added flag: source entry not found or not owned, skipping');
        } else {
          const updatedContent = { ...(entry.content ?? {}), tasks_added: true };
          const { error: flagErr } = await db
            .from('plant_timeline')
            .update({ content: updatedContent })
            .eq('id', sourceId)
            .eq('user_id', userId);  // belt-and-braces ownership check on write

          if (flagErr) {
            console.error('[POST /api/tasks/bulk] tasks_added flag update failed:', flagErr.message);
          }
        }
      } catch (flagEx: any) {
        console.error('[POST /api/tasks/bulk] tasks_added flag threw:', flagEx.message);
      }
    }

    res.json({
      ok:               true,
      count:            insertedTasks.length,
      tasks:            insertedTasks,
      skipped_existing: existingMatched.length + dbSkipped,
    });
  } catch (err: any) {
    console.error('[POST /api/tasks/bulk]', err.message);
    res.status(500).json({ error: err.message });
  }
});
