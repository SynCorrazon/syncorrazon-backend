import { Router } from 'express';
import { randomInt } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import '../config/firebase-admin.js';
import { authenticate, type AuthenticatedRequest } from '../core/middleware/authenticate.js';

export const roomRouter = Router();
const db = getFirestore();
const rooms = db.collection('rooms');
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const uidOf = (req: AuthenticatedRequest) => req.user.uid;

type RoomDocument = {
  roomCode: string;
  creatorUid: string;
  participants: string[];
  videoUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const toResponseRoom = (id: string, room: FirebaseFirestore.DocumentData) => {
  const participants = Array.isArray(room.participants) ? room.participants : [];
  return {
    id,
    roomCode: room.roomCode,
    creatorUid: room.creatorUid,
    participants,
    ...(room.videoUrl ? { videoUrl: room.videoUrl } : {}),
    isActive: Boolean(room.isActive),
    participantCount: participants.length,
    createdAt: room.createdAt?.toDate?.()?.toISOString?.() ?? room.createdAt ?? new Date().toISOString(),
    updatedAt: room.updatedAt?.toDate?.()?.toISOString?.() ?? room.updatedAt ?? new Date().toISOString(),
  };
};

const roomRefByParam = async (roomParam: string) => {
  const normalized = roomParam.trim().toUpperCase();
  if (/^[A-HJ-NP-Z2-9]{6}$/.test(normalized)) {
    const snapshot = await rooms.where('roomCode', '==', normalized).limit(1).get();
    if (!snapshot.empty) return { ref: snapshot.docs[0].ref, snapshot: snapshot.docs[0] };
  }
  const ref = rooms.doc(normalized);
  const snapshot = await ref.get();
  return { ref, snapshot };
};

const videoIdFromUrl = (raw: unknown): string | null => {
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
};

const makeRoomCode = () => Array.from({ length: 6 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join('');

const activeRoomsForUser = async (uid: string) => rooms.where('participants', 'array-contains', uid).where('isActive', '==', true).get();

roomRouter.use(authenticate);

roomRouter.post('/', async (req, res, next) => {
  try {
    const videoId = req.body?.videoUrl === undefined ? null : videoIdFromUrl(req.body.videoUrl);
    if (req.body?.videoUrl !== undefined && !videoId) {
      res.status(400).json({ success: false, message: 'Please provide a valid YouTube video URL.', code: 'BAD_REQUEST' });
      return;
    }

    const uid = uidOf(req as AuthenticatedRequest);
    const activeRooms = await activeRoomsForUser(uid);
    if (!activeRooms.empty) {
      res.status(400).json({ success: false, message: 'You must leave your active room before creating another.', code: 'BAD_REQUEST' });
      return;
    }

    let roomCode = '';
    let response;
    let created = false;
    for (let attempt = 0; attempt < 8 && !created; attempt += 1) {
      roomCode = makeRoomCode();
      const existing = await rooms.where('roomCode', '==', roomCode).limit(1).get();
      if (!existing.empty) continue;

      const ref = rooms.doc();
      const now = new Date().toISOString();
      const room: RoomDocument = {
        roomCode,
        creatorUid: uid,
        participants: [uid],
        ...(videoId ? { videoUrl: `https://www.youtube.com/watch?v=${videoId}` } : {}),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      await ref.create(room);
      response = toResponseRoom(ref.id, room);
      created = true;
    }

    if (!response) {
      throw new Error('Could not generate a unique room code. Please try again.');
    }

    res.status(201).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

roomRouter.get('/', async (req, res, next) => {
  try {
    const snapshot = await rooms.where('participants', 'array-contains', uidOf(req as AuthenticatedRequest)).get();
    const data = snapshot.docs.map((doc) => toResponseRoom(doc.id, doc.data()));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

roomRouter.get('/:roomId', async (req, res, next) => {
  try {
    const { snapshot } = await roomRefByParam(req.params.roomId);
    if (!snapshot.exists) {
      res.status(404).json({ success: false, message: 'Room not found.', code: 'NOT_FOUND' });
      return;
    }

    const room = snapshot.data();
    const participants = Array.isArray(room?.participants) ? room.participants : [];
    if (!participants.includes(uidOf(req as AuthenticatedRequest))) {
      res.status(403).json({ success: false, message: 'You are not a participant in this room.', code: 'FORBIDDEN' });
      return;
    }

    res.json({ success: true, data: toResponseRoom(snapshot.id, room) });
  } catch (error) {
    next(error);
  }
});

roomRouter.post('/join', async (req, res, next) => {
  try {
    const roomCode = typeof req.body?.roomCode === 'string' ? req.body.roomCode.trim().toUpperCase() : '';
    if (!/^[A-HJ-NP-Z2-9]{6}$/.test(roomCode)) {
      res.status(400).json({ success: false, message: 'Enter a valid 6-character room code.', code: 'BAD_REQUEST' });
      return;
    }

    const uid = uidOf(req as AuthenticatedRequest);
    const matching = await rooms.where('roomCode', '==', roomCode).limit(1).get();
    if (matching.empty) {
      res.status(404).json({ success: false, message: 'Room not found.', code: 'NOT_FOUND' });
      return;
    }

    const ref = matching.docs[0].ref;
    const result = await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) return { error: 'Room not found', status: 404 } as const;
      const room = snapshot.data()!;
      const participants = Array.isArray(room.participants) ? room.participants : [];
      if (!room.isActive) return { error: 'This room is no longer active.', status: 404 } as const;
      if (participants.includes(uid)) return { data: toResponseRoom(snapshot.id, room) } as const;

      const otherActiveRooms = await transaction.get(rooms.where('participants', 'array-contains', uid).where('isActive', '==', true));
      if (!otherActiveRooms.empty) return { error: 'Leave your current active room before joining another.', status: 400 } as const;
      if (participants.length >= 2) return { error: 'This room is full.', status: 400 } as const;

      const updated = { ...room, participants: [...participants, uid], updatedAt: new Date().toISOString() };
      transaction.update(ref, { participants: updated.participants, updatedAt: updated.updatedAt });
      return { data: toResponseRoom(snapshot.id, updated) } as const;
    });

    if ('error' in result) {
      res.status(result.status).json({ success: false, message: result.error, code: result.status === 404 ? 'NOT_FOUND' : 'BAD_REQUEST' });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (error) {
    next(error);
  }
});

roomRouter.post('/:roomId/leave', async (req, res, next) => {
  try {
    const { ref, snapshot } = await roomRefByParam(req.params.roomId);
    if (!snapshot.exists) {
      res.status(404).json({ success: false, message: 'Room not found.', code: 'NOT_FOUND' });
      return;
    }

    const uid = uidOf(req as AuthenticatedRequest);
    const result = await db.runTransaction(async (transaction) => {
      const current = await transaction.get(ref);
      if (!current.exists) return null;
      const room = current.data()!;
      const participants = Array.isArray(room.participants) ? room.participants : [];
      const remaining = participants.filter((participantUid) => participantUid !== uid);
      const isActive = remaining.length > 0 && Boolean(room.isActive);
      const updatedAt = new Date().toISOString();
      transaction.update(ref, {
        participants: remaining,
        isActive,
        updatedAt,
        ...(isActive ? {} : { deactivatedAt: FieldValue.serverTimestamp() }),
      });
      return toResponseRoom(current.id, { ...room, participants: remaining, isActive, updatedAt });
    });

    if (!result) {
      res.status(404).json({ success: false, message: 'Room not found.', code: 'NOT_FOUND' });
      return;
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

roomRouter.delete('/:roomId', async (req, res, next) => {
  try {
    const { ref, snapshot } = await roomRefByParam(req.params.roomId);
    if (!snapshot.exists) {
      res.status(404).json({ success: false, message: 'Room not found.', code: 'NOT_FOUND' });
      return;
    }

    const uid = uidOf(req as AuthenticatedRequest);
    const room = snapshot.data()!;
    if (room.creatorUid !== uid) {
      res.status(403).json({ success: false, message: 'Only the room creator can delete it.', code: 'FORBIDDEN' });
      return;
    }

    await ref.update({ isActive: false, updatedAt: new Date().toISOString(), deletedAt: FieldValue.serverTimestamp() });
    res.json({ success: true, data: { message: 'Room deactivated successfully.' } });
  } catch (error) {
    next(error);
  }
});
