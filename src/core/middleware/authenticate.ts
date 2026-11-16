import type { NextFunction, Request, Response } from 'express';
import { getAuth } from 'firebase-admin/auth';

export interface AuthenticatedRequest extends Request {
  auth: { uid: string; email?: string };
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const authorization = req.header('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ success: false, message: 'A Firebase sign-in token is required.' });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(match[1]);
    (req as AuthenticatedRequest).auth = { uid: decoded.uid, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Your sign-in has expired. Please sign in again.' });
  }
}
