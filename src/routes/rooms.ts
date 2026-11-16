import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { authenticate, type AuthenticatedRequest } from '../core/middleware/authenticate.js';

export const roomRouter = Router();
const db = getFirestore();
const rooms = db.collection('rooms');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const getUid = (req: AuthenticatedRequest) => req.auth.uid;

function videoIdFromUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/').filter(Boolean)[0] ?? '';
    else if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      if (url.pathname === '/watch') id = url.searchParams.get('v') ?? '';
      else if (/^\/(embed|shorts|live)\//.test(url.pathname)) id = url.pathname.split('/')[2] ?? '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function createCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');
}

roomRouter.use(authenticate);

roomRouter.post('/', async (req, res, next) => {
  try {
    const videoId = videoIdFromUrl(req.body?.videoUrl);
    if (!videoId) {
      res.status(400).json({ success: false, message: 'Please provide a valid YouTube video URL.' });
      return;
    }

    let roomCode = '';
    let ref;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      roomCode = createCode();
      const candidate = rooms.doc(roomCode);
      if (!(await candidate.get()).exists) {
        ref = candidate;
        break;
      }
    }
    if (!ref) throw new Error('Could not allocate a room code. Please try again.');

    const room = {
      roomCode,
      videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
      videoId,
      ownerId: getUid(req as AuthenticatedRequest),
      participantIds: [getUid(req as AuthenticatedRequest)],
      createdAt: FieldValue.serverTimestamp(),
    };
    await ref.create(room);
    res.status(201).json({ success: true, data: { ...room, createdAt: new Date().toISOString() } });
  } catch (error) {
    next(error);
  }
});

roomRouter.get('/', async (req, res, next) => {
  try {
    const snapshot = await rooms.where('participantIds', 'array-contains', getUid(req as AuthenticatedRequest)).get();
    res.json({ success: true, data: snapshot.docs.map((doc) => ({ ...doc.data(), roomCode: doc.id })) });
  } catch (error) {
    next(error);
  }
});

roomRouter.get('/:roomId', async (req, res, next) => {
  try {
    const snapshot = await rooms.doc(req.params.roomId.toUpperCase()).get();
    if (!snapshot.exists) {
      res.status(404).json({ success: false, message: 'Room not found.' });
      return;
    }
    const room = snapshot.data()!;
    if (!room.participantIds?.includes(getUid(req as AuthenticatedRequest))) {
      res.status(403).json({ success: false, message: 'Join this room before opening it.' });
      return;
    }
    res.json({ success: true, data: { ...room, roomCode: snapshot.id } });
  } catch (error) {
    next(error);
  }
});

roomRouter.post('/join', async (req, res, next) => {
  try {
    const code = typeof req.body?.roomCode === 'string' ? req.body.roomCode.trim().toUpperCase() : '';
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
      res.status(400).json({ success: false, message: 'Enter a valid 6-character room code.' });
      return;
    }
    const ref = rooms.doc(code);
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { error: 'Room not found.' as const };
      const room = snapshot.data()!;
      const uid = getUid(req as AuthenticatedRequest);
      const participants: string[] = room.participantIds ?? [];
      if (!participants.includes(uid) && participants.length >= 2) return { error: 'This room is full.' as const };
      if (!participants.includes(uid)) transaction.update(ref, { participantIds: [...participants, uid] });
      return { room: { ...room, roomCode: code } };
    });
    if ('error' in result) {
      res.status(result.error === 'Room not found.' ? 404 : 409).json({ success: false, message: result.error });
      return;
    }
    res.json({ success: true, data: result.room });
  } catch (error) {
    next(error);
  }
});

roomRouter.post('/:roomId/leave', async (req, res, next) => {
  try {
    const ref = rooms.doc(req.params.roomId.toUpperCase());
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return;
      const participants: string[] = snapshot.data()?.participantIds ?? [];
      transaction.update(ref, { participantIds: participants.filter((uid) => uid !== getUid(req as AuthenticatedRequest)) });
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
