import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePlanStore } from '../stores/planStore';
import { useGardenStore } from '../stores/gardenStore';
import { useAuthStore } from '../stores/authStore';
import { WeeklyPlanHeader } from '../components/plan/WeeklyPlanHeader';
import { DayPlanCard } from '../components/plan/DayPlanCard';
import { WeeklyTaskList } from '../components/plan/WeeklyTaskList';
import { TaskManager } from '../components/plan/TaskManager';
import { NotificationBanner } from '../components/plan/NotificationBanner';
import { useTasks } from '../hooks/useTasks';
import { printWeeklyPlan } from '../utils/printPlan';

const GOLD   = '#00e5c3';
const PARCH  = '#b0cfbf';
const FRANK  = '"Frank Ruhl Libre", Georgia, serif';
const ASSIST = "'DM Sans', 'Assistant', 'Heebo', sans-serif";

const PLAN_CSS = `
@keyframes plan-moon-pulse {
  0%, 100% { opacity: 0.8; transform: scale(1); }
  50%       { opacity: 1;   transform: scale(1.08); }
}
@keyframes plan-fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
`;

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
}

function LoadingState() {
  const { t } = useTranslation('plan');
  return (
    <div dir="rtl" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 80px)',
      padding: '40px 16px', textAlign: 'center',
    }}>
      <span style={{ fontSize: '56px', animation: 'plan-moon-pulse 2.5s ease-in-out infinite' }}>🌱</span>
      <p style={{ fontFamily: FRANK, fontSize: '20px', color: GOLD, margin: '20px 0 8px' }}>
        {t('loading.title')}
      </p>
      <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}66`, margin: 0 }}>
        {t('loading.subtitle')}
      </p>
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  const { t } = useTranslation('plan');
  return (
    <div dir="rtl" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 80px)',
      padding: '40px 16px', textAlign: 'center',
    }}>
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</span>
      <p style={{ fontFamily: FRANK, fontSize: '18px', color: `${PARCH}CC`, margin: '0 0 8px' }}>
        {t('error.title')}
      </p>
      <p style={{ fontFamily: ASSIST, fontSize: '13px', color: `${PARCH}55`, margin: '0 0 24px', maxWidth: '300px' }}>
        {error}
      </p>
      <button
        onClick={onRetry}
        style={{
          fontFamily: ASSIST, fontSize: '14px', fontWeight: 600,
          padding: '10px 24px', borderRadius: '8px',
          border: `1px solid ${GOLD}55`, color: GOLD,
          backgroundColor: 'transparent', cursor: 'pointer',
        }}
      >
        {t('error.retry')}
      </button>
    </div>
  );
}

function NoGardenPrompt({ onNavigate }: { onNavigate: () => void }) {
  const { t } = useTranslation('plan');
  return (
    <div dir="rtl" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: 'calc(100vh - 80px)',
      padding: '40px 24px', textAlign: 'center',
    }}>
      <span style={{ fontSize: '56px', marginBottom: '16px' }}>🌿</span>
      <h2 style={{ fontFamily: FRANK, fontSize: '22px', color: GOLD, margin: '0 0 10px' }}>
        {t('noGarden.title')}
      </h2>
      <p style={{ fontFamily: ASSIST, fontSize: '14px', color: `${PARCH}88`, margin: '0 0 28px', maxWidth: '300px', lineHeight: 1.4 }}>
        {t('noGarden.desc')}
      </p>
      <button
        onClick={onNavigate}
        style={{
          fontFamily: FRANK, fontSize: '15px', fontWeight: 700,
          padding: '12px 28px', borderRadius: '8px', border: 'none',
          backgroundColor: GOLD, color: '#050d0a', cursor: 'pointer',
        }}
      >
        {t('noGarden.cta')}
      </button>
    </div>
  );
}

export function PlanPage() {
  const navigate    = useNavigate();
  const { t, i18n } = useTranslation('plan');
  const isHe        = i18n.language === 'he';
  const planStore   = usePlanStore();
  const gardenStore = useGardenStore();
  const { session } = useAuthStore();
  const today       = todayISO();

  const { tasks, isLoading: tasksLoading, updateStatus, addTask, deleteTask, autoCreateFromPlan } = useTasks();
  const [tasksConfirmed, setTasksConfirmed] = useState(false);

  const [gardenCheckStarted, setGardenCheckStarted] = useState(false);

  useEffect(() => {
    setGardenCheckStarted(true);
    if (gardenStore.gardens.length === 0) {
      gardenStore.loadGardens();
    }
  }, []);

  useEffect(() => {
    if (
      gardenCheckStarted &&
      !gardenStore.isLoading &&
      gardenStore.gardens.length > 0 &&
      !planStore.weeklyPlan &&
      !planStore.isLoading
    ) {
      planStore.loadWeeklyPlan(i18n.language);
    }
  }, [gardenCheckStarted, gardenStore.isLoading, gardenStore.gardens.length]);

  // Auto-create tasks from plan when plan first loads and no tasks exist yet
  useEffect(() => {
    const plan = planStore.weeklyPlan;
    if (!plan || tasksConfirmed || tasks.length > 0 || !session?.access_token) return;
    console.log('[PlanPage] auto-create: calling fromPlanAuto');
    autoCreateFromPlan()
      .then((created) => {
        console.log('[PlanPage] autoCreateFromPlan returned', created.length, 'tasks');
        setTasksConfirmed(true);
      })
      .catch((err) => {
        console.error('[PlanPage] autoCreateFromPlan FAILED:', err);
      });
  }, [planStore.weeklyPlan, session?.access_token]);

  const [expandedDay, setExpandedDay] = useState<string | null>(today);

  const isGardenLoading = !gardenCheckStarted || gardenStore.isLoading;

  if (isGardenLoading) return (
    <div style={{ background: '#050d0a', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <LoadingState />
    </div>
  );

  if (gardenStore.gardens.length === 0) return (
    <div style={{ background: '#050d0a', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <NoGardenPrompt onNavigate={() => navigate('/garden')} />
    </div>
  );

  if (planStore.isLoading || (!planStore.weeklyPlan && !planStore.error)) return (
    <div style={{ background: '#050d0a', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <LoadingState />
    </div>
  );

  if (planStore.error && !planStore.weeklyPlan) return (
    <div style={{ background: '#050d0a', minHeight: '100vh' }}>
      <style>{PLAN_CSS}</style>
      <ErrorState error={planStore.error} onRetry={() => planStore.loadWeeklyPlan()} />
    </div>
  );

  const plan = planStore.weeklyPlan!;

  return (
    <div dir={isHe ? 'rtl' : 'ltr'} style={{ background: '#050d0a', minHeight: '100vh', paddingTop: '80px', paddingBottom: '64px' }}>
      <style>{PLAN_CSS}</style>

      {/* Noise overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        opacity: 0.025, pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: '680px', margin: '0 auto', padding: '0 16px',
        animation: 'plan-fade-in 0.4s ease-out both',
      }}>
        <WeeklyPlanHeader plan={plan} />
        <NotificationBanner />
        <TaskManager
          tasks={tasks}
          onUpdateStatus={updateStatus}
          onDelete={deleteTask}
          onAdd={addTask}
          isLoading={tasksLoading}
        />
        <WeeklyTaskList tasks={plan.gardenTasks} weekStart={plan.weekStart} />

        {plan.days.map(day => (
          <DayPlanCard
            key={day.date}
            day={day}
            isToday={day.date === today}
            isExpanded={expandedDay === day.date}
            onToggle={() => setExpandedDay(prev => prev === day.date ? null : day.date)}
          />
        ))}

        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <button
            onClick={() => printWeeklyPlan(plan, today)}
            title={t('printButton')}
            style={{
              fontFamily: ASSIST, fontSize: '14px', fontWeight: 500,
              padding: '11px 28px', borderRadius: '8px',
              border: 'rgba(0,229,195,0.25) 1px solid',
              color: `${PARCH}88`, backgroundColor: 'transparent', cursor: 'pointer',
              transition: 'color 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = PARCH;
              (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = `${PARCH}88`;
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,229,195,0.25)';
            }}
          >
            {t('printButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
