import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { config } from '../config/env.js';

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: config.firebase.projectId,
      privateKey: config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail,
    }),
  });
}
