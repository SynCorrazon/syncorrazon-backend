import { createServer } from 'http';
import { Server } from 'socket.io';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import app from './app.js';
import { config } from './config/env.js';
import { logger } from './utils/logger.js';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      privateKey: config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail,
    }),
  });
}

const httpServer = createServer(app);
const allowedOrigins = config.corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
export const io = new Server(httpServer, { cors: { origin: allowedOrigins, methods: ['GET', 'POST'] } });
const PORT = config.port;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
