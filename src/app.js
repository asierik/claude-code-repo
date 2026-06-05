import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { authRoutes } from './routes/authRoutes.js';
import { spaceRoutes } from './routes/spaceRoutes.js';
import { dishRoutes } from './routes/dishRoutes.js';
import { planRoutes } from './routes/planRoutes.js';
import { groceryRoutes } from './routes/groceryRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', authRoutes);
  app.use('/api/spaces', spaceRoutes);
  app.use('/api/spaces/:spaceId/dishes', dishRoutes);
  app.use('/api/spaces/:spaceId/plan', planRoutes);
  app.use('/api/spaces/:spaceId/grocery', groceryRoutes);

  // Static Angular PWA build.
  const browserDir = join(__dirname, '..', 'web', 'dist', 'web', 'browser');
  app.use(express.static(browserDir));

  // SPA fallback: any non-API GET that didn't match a file serves index.html.
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      return res.sendFile(join(browserDir, 'index.html'));
    }
    next();
  });

  // Errors thrown in any handler/middleware land here as JSON.
  app.use(errorHandler);
  return app;
}
