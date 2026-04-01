import 'dotenv/config';
import express, { Express } from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';

const app: Express = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '20mb' }));
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [
            'https://gina-haya.com',
            'https://www.gina-haya.com',
            'https://gina-haya.vercel.app',
        ]
        : ['http://localhost:5173', 'http://127.0.0.1:5173'],
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
import { mooshRouter }   from './routes/moosh';
import { billingRouter } from './routes/billing';
import { emailRouter }   from './routes/email';
import { harvestsRouter }  from './routes/harvests';
import { trackersRouter }  from './routes/trackers';
import { plansRouter }   from './routes/plans';
import { mapRouter }     from './routes/map';
import { usersRouter }   from './routes/users';
import { tasksRouter }   from './routes/tasks';
import { pushRouter }    from './routes/push';
import { startCronJobs } from './services/cronJobs';

app.use('/api/auth',     authRouter);
app.use('/api/garden',   gardenRouter);
app.use('/api/plants',   plantsRouter);
app.use('/api/calendar', calendarRouter);
app.use('/api/moosh',    mooshRouter);
app.use('/api/billing',  billingRouter);
app.use('/api/email',    emailRouter);
app.use('/api/harvests', harvestsRouter);
app.use('/api/trackers', trackersRouter);
app.use('/api/plans',    plansRouter);
app.use('/api/map',      mapRouter);
app.use('/api/users',    usersRouter);
app.use('/api/tasks',    tasksRouter);
app.use('/api/push',     pushRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`Gina Haya API running on http://localhost:${PORT}`);
  startCronJobs();
});

export default app;
