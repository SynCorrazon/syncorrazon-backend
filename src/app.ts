import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './core/middleware/error-handler.js';
import { requestLogger } from './core/middleware/logger.js';
import { config } from './config/env.js';
import { authenticate } from './core/middleware/authenticate.js';
import { roomRouter } from './routes/rooms.js';

const app: Express = express();
const allowedOrigins = config.corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), environment: config.nodeEnv });
});

app.get('/api/v1/auth/me', authenticate, (req, res) => {
  res.json({ success: true, data: { uid: req.auth.uid, email: req.auth.email ?? null } });
});
app.use('/api/v1/rooms', roomRouter);

app.use(errorHandler);
export default app;
