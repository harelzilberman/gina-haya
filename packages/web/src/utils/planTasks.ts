import { api } from '../api/client';
import { tasksApi } from '../api/tasks';
import type { WeeklyPlan } from '../stores/planStore';

export type PlanTaskRow = {
  date: string;
  title: string;
  type: 'biodynamic' | 'maintenance' | 'custom';
  source_action?: string;
};

/**
 * Converts a WeeklyPlan object into the flat task rows that go into garden_tasks.
 * Identical to the synthesis logic in PlanPage.tsx.
 */
export function synthesizePlanTasks(plan: WeeklyPlan): PlanTaskRow[] {
  const rows: PlanTaskRow[] = [];

  plan.gardenTasks.forEach((task: string) => {
    rows.push({ date: plan.weekStart, title: task, type: 'maintenance' });
  });

  plan.days.forEach((day: any) => {
    if (day.prep500) rows.push({ date: day.date, title: 'הכנת פרפרט 500',    type: 'biodynamic', source_action: 'prep500' });
    if (day.prep501) rows.push({ date: day.date, title: 'הכנת פרפרט 501', type: 'biodynamic', source_action: 'prep501' });
    day.recommendedActions?.slice(0, 2).forEach((action: string) => {
      rows.push({ date: day.date, title: action, type: 'biodynamic', source_action: action });
    });
  });

  return rows;
}

/**
 * Fetches the current weekly plan and seeds garden_tasks from it.
 * Returns true if tasks were created, false if no plan or no tasks to create.
 */
export async function seedTasksFromWeeklyPlan(token: string): Promise<boolean> {
  const plan = await api.get<WeeklyPlan>('/api/plans/weekly', token);
  if (!plan) return false;
  const rows = synthesizePlanTasks(plan);
  if (rows.length === 0) return false;
  await tasksApi.fromPlan(null, rows, token);
  return true;
}
