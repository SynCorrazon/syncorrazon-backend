import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import type { AuthService } from './auth.service.js';
import { auth } from '../config/firebase.js';
import { BadRequestError, UnauthorizedError } from '../core/errors/custom-errors.js';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  async signupOrLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        throw new BadRequestError('ID token required');
      }

      const user = await this.authService.authenticate(idToken);

      res.json({
        success: true,
        user,
      });
    } catch (err) {
      next(err);
    }
  }

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];

      if (!token) {
        throw new UnauthorizedError('No token provided');
      }

      const decoded = await auth.verifyIdToken(token);
      const user = await this.authService.getProfile(decoded.uid);

      res.json({
        success: true,
        user,
      });
    } catch (err) {
      next(err);
    }
  }
}

export function registerAuthRoutes(router: Router, authController: AuthController): void {
  router.post('/', authController.signupOrLogin.bind(authController));

  router.get('/me', authController.getProfile.bind(authController));
}
