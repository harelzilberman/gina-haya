import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

// Fail fast on missing critical env vars
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY is not set. Plant analysis will not work.');
  process.exit(1);
}

const app: Express = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

// CORS_ORIGINS env var overrides defaults (comma-separated list)
const productionOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
  : ['https://gina-haya.com', 'https://www.gina-haya.com', 'https://gina-haya.vercel.app'];

const allowedOrigins = process.env.NODE_ENV === 'development'
  ? ['http://localhost:5173', 'http://127.0.0.1:5173']
  : productionOrigins;

console.log(`[CORS] NODE_ENV=${process.env.NODE_ENV ?? 'unset'}, allowed origins:`, allowedOrigins);

app.use(express.json({ limit: '20mb' }));
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

import { authRouter }    from './routes/auth';
import { gardenRouter }  from './routes/garden';
import { plantsRouter }  from './routes/plants';
import { calendarRouter } from './routes/calendar';
import { chupChuRouter } from './routes/chupchu';
import { billingRouter } from './routes/billing';
import { emailRouter }   from './routes/email';
import { harvestsRouter }  from './routes/harvests';
import { trackersRouter }  from './routes/trackers';
import { plansRouter }   from './routes/plans';
import { mapRouter }     from './routes/map';
import { usersRouter }   from './routes/users';
import { tasksRouter }    from './routes/tasks';
import { pushRouter }     from './routes/push';
import { articlesRouter } from './routes/articles';
import { shopRouter }       from './routes/shop';
import { templatesRouter }  from './routes/templates';
import { startCronJobs } from './services/cronJobs';

app.use('/api/auth',     authRouter);
app.use('/api/garden',   gardenRouter);
app.use('/api/plants',   plantsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/chupchu', chupChuRouter);
app.use('/api/billing',  billingRouter);
app.use('/api/email',    emailRouter);
app.use('/api/harvests', harvestsRouter);
app.use('/api/trackers', trackersRouter);
app.use('/api/plans',    plansRouter);
app.use('/api/map',      mapRouter);
app.use('/api/users',    usersRouter);
app.use('/api/tasks',    tasksRouter);
app.use('/api/push',     pushRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/shop',      shopRouter);
app.use('/api/templates', templatesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Gina Haya API running on http://localhost:${PORT}`);
  startCronJobs();
});

export default app;
