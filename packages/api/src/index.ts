import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
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

// 2 MB ceiling: post-compression images peak at ~600 KB base64; anything
// larger than 2 MB is suspicious and benefits from early rejection.
app.use(express.json({ limit: '2mb' }));
// Grow webhook may send application/x-www-form-urlencoded instead of JSON.
// Register urlencoded parser specifically for that path so the diagnostic
// log in billing.ts captures real field values regardless of content-type.
app.use('/api/billing/grow/webhook', express.urlencoded({ extended: true }));
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

// Serve article images from the web package's public directory
app.use('/images', express.static(path.join(__dirname, '../public/images')));

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
import { usersRouter }   from './routes/users';
import { tasksRouter }    from './routes/tasks';
import { pushRouter }     from './routes/push';
import { articlesRouter } from './routes/articles';
import { journalRouter }  from './routes/journal';
import { shopRouter }       from './routes/shop';
import { templatesRouter }  from './routes/templates';
import { dashboardRouter }  from './routes/dashboard';
import knowledgeRouter      from './routes/knowledge';
import { weatherRouter }    from './routes/weather';
import { homeRouter }       from './routes/home';
import { waitlistRouter }      from './routes/waitlist';
import { recognitionsRouter }  from './routes/recognitions';
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
app.use('/api/users',    usersRouter);
app.use('/api/tasks',    tasksRouter);
app.use('/api/push',     pushRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/journal',  journalRouter);
app.use('/api/shop',             shopRouter);
app.use('/api/templates',        templatesRouter);
app.use('/api/dashboard',        dashboardRouter);
app.use('/api/admin/knowledge',  knowledgeRouter);
app.use('/api/weather',          weatherRouter);
app.use('/api/home',             homeRouter);
app.use('/api/waitlist',         waitlistRouter);
app.use('/api/recognitions',     recognitionsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Fix F: global error handler — must be registered AFTER all routes and the 404 handler.
// Intercepts errors passed via next(err), primarily body-parser (express.json) failures
// that would otherwise reach Node's finalhandler and appear in Railway as raw stack traces.
// Route handlers manage their own errors internally (try/catch → res.status(5xx).json())
// and never call next(err), so this handler does not interfere with normal request flow.
// err.status is set by body-parser on JSON parse failure (400); default to 400 for
// other middleware errors since they typically indicate a bad request.
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[express error]', req.method, req.path, err.message);
  res.status(err.status ?? 400).json({ error: 'invalid_request' });
});

app.listen(PORT, () => {
  console.log(`Gina Haya API running on http://localhost:${PORT}`);
  startCronJobs();
});

export default app;
