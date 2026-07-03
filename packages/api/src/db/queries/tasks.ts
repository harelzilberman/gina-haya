import { db } from '../client';

export interface GardenTask {
  id: string;
  user_id: string;
  plan_id: string | null;
  plant_tracker_id: string | null;
  garden_plants_id: string | null;
  date: string;
  title: string;
  type: 'biodynamic' | 'maintenance' | 'custom';
  status: 'pending' | 'done' | 'skipped';
  notes: string | null;
  plant_name: string | null;
  category: string;
  priority: 'low' | 'medium' | 'high';
  source_action: string | null;
  created_at: string;
  updated_at: string;
}

export async function getTasksForWeek(
  userId: string,
  from: string,
  to: string,
  includeArchived = false,
): Promise<GardenTask[]> {
  // When includeArchived is false (default), exclude tasks linked to archived plants.
  // Tasks with garden_plants_id NULL (general tasks + legacy name-only tasks) are
  // never filtered — they have no plant FK to check.
  //
  // Known gap: tasks with plant_name set but garden_plants_id NULL (pre-018 legacy
  // rows) are NOT filtered even if the named plant has since been archived. This is
  // intentional — we cannot reliably match by name after a potential rename.

  let archivedPlantIds: string[] = [];

  if (!includeArchived) {
    // garden_plants has no user_id; resolve via the user's garden IDs.
    const { data: userGardens, error: gardensError } = await db
      .from('gardens')
      .select('id')
      .eq('user_id', userId);

    if (gardensError) throw gardensError;

    const gardenIds = (userGardens ?? []).map((g: any) => g.id);

    if (gardenIds.length > 0) {
      const { data: archivedPlants, error: archivedError } = await db
        .from('garden_plants')
        .select('id')
        .in('garden_id', gardenIds)
        .not('archived_at', 'is', null);

      if (archivedError) throw archivedError;
      archivedPlantIds = (archivedPlants ?? []).map((p: any) => p.id);
    }
  }

  let query = db
    .from('garden_tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true });

  if (archivedPlantIds.length > 0) {
    // Exclude tasks linked to archived plants while keeping tasks with no plant
    // link (garden_plants_id IS NULL). Using .or() because SQL NOT IN excludes
    // NULL rows (NULL NOT IN (...) evaluates to NULL/unknown, not TRUE).
    query = query.or(
      `garden_plants_id.is.null,garden_plants_id.not.in.(${archivedPlantIds.join(',')})`
    );
  }

  const { data, error } = await query;
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
  plant_name?: string,
  garden_plants_id?: string,
): Promise<GardenTask> {
  const { data, error } = await db
    .from('garden_tasks')
    .insert({ user_id: userId, date, title, type: 'custom', status: 'pending', notes: notes ?? null, source_action: source_action ?? null, plant_name: plant_name ?? null, garden_plants_id: garden_plants_id ?? null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTasksForRange(
  userId: string,
  from: string,
  to: string,
  includeArchived = false,
): Promise<GardenTask[]> {
  return getTasksForWeek(userId, from, to, includeArchived);
}

export async function updateTask(
  taskId: string,
  userId: string,
  updates: { status?: 'pending' | 'done' | 'skipped'; notes?: string | null; date?: string; title?: string; plant_name?: string | null },
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
