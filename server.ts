import './server/env.ts';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { db, DATABASE_PATH } from './server/db.ts';
import { createApp } from './server/app.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = createApp();
  const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
  if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  // Vite middleware in dev or static files in prod
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Lead Full-Stack Server running on http://0.0.0.0:${PORT}`);
    console.log(`SQLite database: ${DATABASE_PATH}`);
  });
  server.on('error', (error) => {
    console.error('Server error:', error);
    db.close();
    process.exit(1);
  });
  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
