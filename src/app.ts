import express from 'express';
import type { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './core/middleware/error-handler.js';
import { requestLogger } from './core/middleware/logger.js';
import { config } from './config/env.js';
import { createAuthRouter } from './auth/auth.route.js';
import { initializeFirebase } from './config/firebase.js';
import { createRoomsRouter } from './rooms/rooms.route.js';

const app: Express = express();

// Security middleware
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
initializeFirebase();
// Compression
app.use(compression());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

app.use('/api/v1/auth', createAuthRouter());
app.use('/api/v1/rooms', createRoomsRouter());

// Error handling (must be last)
app.use(errorHandler);

export default app;
