import type { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';
import '../config/firebase-admin.js';

export interface AuthenticatedRequest extends Request {
  user: { uid: string; email?: string; name?: string; picture?: string };
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authorization = req.header('authorization');
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    res.status(401).json({ success: false, message: 'No token provided', code: 'UNAUTHORIZED' });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(match[1]);
    (req as AuthenticatedRequest).user = {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name,
      picture: decoded.picture,
    };
    next();
  } catch {
    next({ statusCode: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token' });
  }
}
