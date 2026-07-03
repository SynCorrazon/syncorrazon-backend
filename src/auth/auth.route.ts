import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

import { registerAuthRoutes } from './auth.controller.js';
import { AuthRepository } from './auth.repo.js';

export function createAuthRouter() {
  const router = Router();

  const authRepository = new AuthRepository();
  const authService = new AuthService(authRepository);
  const authController = new AuthController(authService);

  registerAuthRoutes(router, authController);

  return router;
}
