import express from 'express';
import type { Express } from 'express';
import { errorHandler } from '../../../core/middleware/error-handler.js';
import { createAuthRouter } from '../../../auth/auth.route.js';
import { createRoomsRouter } from '../../../rooms/rooms.route.js';
export function createTestApp(): Express {
  const app = express();

  app.use(express.json());
  app.use('/api/v1/auth', createAuthRouter());
  app.use('/api/v1/rooms', createRoomsRouter());
  app.use(errorHandler);

  return app;
}

export const mockUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  name: 'Test User',
  picture: 'https://example.com/photo.jpg',
};

export const mockDatabaseUser = {
  uid: 'test-uid-123',
  email: 'test@example.com',
  displayName: 'Test User',
  photoURL: 'https://example.com/photo.jpg',
  createdAt: new Date(),
};
