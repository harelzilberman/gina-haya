import { db } from '../client';

export interface GardenTask {
  id: string;
  user_id: string;
  plan_id: string | null;
  date: string;
  title: string;
  type: 'biodynamic' | 'maintenance' | 'custom';
  status: 'pending' | 'done' | 'skipped';
  notes: string | null;
  source_action: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTasksForWeek(userId: string, from: string, to: string): Promise<GardenTask[]> {
  const { data, error } = await db
    .from('garden_tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getRecentCompletedTasks(userId: string, days = 7): Promise<GardenTask[]> {
  const from = new Date();
  from.setDate(from.getDate() - days);
  const fromStr = from.toISOString().slice(0, 10);
  const { data, error } = await db
    .from('garden_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'done')
    .gte('date', fromStr)
    .order('date', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createTasksFromPlan(
  userId: string,
  planId: string | null,
  tasks: Array<{ date: string; title: string; type: 'biodynamic' | 'maintenance' | 'custom'; source_action?: string }>
): Promise<GardenTask[]> {
  // Delete existing pending tasks for this week that came from a plan
  if (planId) {
    await db.from('garden_tasks').delete().eq('user_id', userId).eq('plan_id', planId).eq('status', 'pending');
  }
  const rows = tasks.map(t => ({
    user_id: userId,
    plan_id: planId,
    date: t.date,
    title: t.title,
    type: t.type,
    status: 'pending' as const,
    source_action: t.source_action ?? null,
  }));
  console.log('[createTasksFromPlan] inserting', rows.length, 'rows into garden_tasks for user', userId);
  const { data, error } = await db.from('garden_tasks').insert(rows).select();
  if (error) {
    console.error('[createTasksFromPlan] Supabase error:', error.message, error.code, error.details, error.hint);
    throw error;
  }
  console.log('[createTasksFromPlan] inserted successfully, count:', data?.length);
  return data ?? [];
}

export async function updateTaskStatus(
  taskId: string,
  userId: string,
  status: 'pending' | 'done' | 'skipped',
  notes?: string
): Promise<GardenTask | null> {
  const { data, error } = await db
    .from('garden_tasks')
    .update({ status, notes: notes ?? null, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const { error } = await db.from('garden_tasks').delete().eq('id', taskId).eq('user_id', userId);
  if (error) throw error;
}

export async function createCustomTask(
  userId: string,
  date: string,
  title: string,
  notes?: string,
  source_action?: string,
): Promise<GardenTask> {
  const { data, error } = await db
    .from('garden_tasks')
    .insert({ user_id: userId, date, title, type: 'custom', status: 'pending', notes: notes ?? null, source_action: source_action ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTasksForRange(userId: string, from: string, to: string): Promise<GardenTask[]> {
  return getTasksForWeek(userId, from, to);
}

export async function updateTask(
  taskId: string,
  userId: string,
  updates: { status?: 'pending' | 'done' | 'skipped'; notes?: string | null; date?: string; title?: string },
): Promise<GardenTask | null> {
  const { data, error } = await db
    .from('garden_tasks')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
