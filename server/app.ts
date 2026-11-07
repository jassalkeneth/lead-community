import express, { type ErrorRequestHandler } from 'express';
import { db } from './db.ts';
import authRouter from './routes/auth.ts';
import communitiesRouter from './routes/communities.ts';
import periodsRouter from './routes/periods.ts';
import scorecardsRouter from './routes/scorecards.ts';
import actionsRouter from './routes/actions.ts';
import aiRouter from './routes/ai.ts';
import reportsRouter from './routes/reports.ts';
import auditRouter from './routes/audit.ts';
import testRunnerRouter from './routes/testRunner.ts';

export function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/api/auth', authRouter);
  app.use('/api/communities', communitiesRouter);
  app.use('/api/periods', periodsRouter);
  app.use('/api/scorecards', scorecardsRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/tests', testRunnerRouter);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: db.health(), time: new Date().toISOString() });
  });

  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
  });

  const handleApiError: ErrorRequestHandler = (error: unknown, req, res, next) => {
    if (res.headersSent) {
      next(error);
      return;
    }
    console.error(`Request failed: ${req.method} ${req.path}`, error);
    const code = error && typeof error === 'object' ? Reflect.get(error, 'errcode') : undefined;
    if (typeof code === 'number' && (code & 255) === 19) {
      res.status(400).json({ error: 'Database validation failed. Check references, required fields, and allowed values.' });
      return;
    }
    const status = error && typeof error === 'object' ? Reflect.get(error, 'status') : undefined;
    if (status === 400 || status === 413) {
      res.status(status).json({ error: status === 413 ? 'Request body is too large.' : 'Invalid request body.' });
      return;
    }
    res.status(500).json({ error: 'The server could not complete the request. Check the server logs and retry.' });
  };
  app.use(handleApiError);
  return app;
}
