import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import workspaceRoutes from './routes/workspaces.js';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || env.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(globalLimiter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'backendmosaic' });
});

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
