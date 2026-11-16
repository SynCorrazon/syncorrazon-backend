import { Router } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import '../config/firebase-admin.js';
import { authenticate, type AuthenticatedRequest } from '../core/middleware/authenticate.js';

export const authRouter = Router();
const users = getFirestore().collection('users');

authRouter.post('/', async (req, res, next) => {
  try {
    const idToken = req.body?.idToken;
    if (typeof idToken !== 'string' || idToken.length < 20) {
      res.status(400).json({ success: false, message: 'A valid Firebase ID token is required.', code: 'BAD_REQUEST' });
      return;
    }

    const decoded = await getAuth().verifyIdToken(idToken);
    const ref = users.doc(decoded.uid);
    const existing = await ref.get();
    const user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      ...(decoded.name ? { displayName: decoded.name } : {}),
      ...(decoded.picture ? { photoURL: decoded.picture } : {}),
      createdAt: existing.exists ? existing.data()?.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await ref.set({ ...user, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json({ success: true, user });
  } catch (error) {
    next({ statusCode: 401, code: 'UNAUTHORIZED', message: 'Invalid or expired token', cause: error });
  }
});

authRouter.get('/me', authenticate, async (req, res, next) => {
  try {
    const uid = (req as AuthenticatedRequest).user.uid;
    const snapshot = await users.doc(uid).get();
    res.json({ success: true, user: snapshot.exists ? snapshot.data() : null });
  } catch (error) {
    next(error);
  }
});
