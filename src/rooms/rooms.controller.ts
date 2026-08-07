import type { Request, Response, NextFunction, Router } from 'express';

import type { CreateRoomDTO, RoomParams } from './rooms.types.js';
import type { RoomsService } from './rooms.service.js';
import { BadRequestError } from '../core/errors/custom-errors.js';
import { authMiddleware } from '../core/middleware/auth.js';
import { validate } from '../core/middleware/validate.js';
import { createRoomSchema, joinRoomSchema, roomParamsSchema } from './rooms.validator.js';

export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  async createRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user!.uid;
      const { youtubeUrl: videoUrl } = req.body;
      const data: CreateRoomDTO = { videoUrl };

      const room = await this.roomsService.createRoom(uid, data);
      res.status(201).json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  async getRoom(req: Request<RoomParams>, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user!.uid;
      const { roomId } = req.params;
      const room = await this.roomsService.getRoom(roomId, uid);
      res.json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  async joinRoom(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user!.uid;
      const { roomCode } = req.body;

      if (!roomCode) {
        throw new BadRequestError('Room code is required');
      }

      const room = await this.roomsService.joinRoom(roomCode, uid);
      res.json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  async leaveRoom(req: Request<RoomParams>, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user!.uid;

      const { roomId } = req.params;
      const room = await this.roomsService.leaveRoom(roomId, uid);
      res.json({ success: true, data: room });
    } catch (err) {
      next(err);
    }
  }

  async deleteRoom(req: Request<RoomParams>, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user!.uid;

      const { roomId } = req.params;
      await this.roomsService.deleteRoom(roomId, uid);
      res.json({ success: true, data: { message: 'Room deleted successfully' } });
    } catch (err) {
      next(err);
    }
  }

  async getUserRooms(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const uid = req.user!.uid;
      const rooms = await this.roomsService.getUserRooms(uid);
      res.json({ success: true, data: rooms });
    } catch (err) {
      next(err);
    }
  }
}

export function registerRoomRoutes(router: Router, roomsController: RoomsController): void {
  router.post(
    '/',
    authMiddleware,
    validate({
      body: createRoomSchema,
    }),
    roomsController.createRoom.bind(roomsController)
  );

  router.get('/', authMiddleware, roomsController.getUserRooms.bind(roomsController));

  router.get(
    '/:roomId',
    authMiddleware,
    validate({
      params: roomParamsSchema,
    }),
    roomsController.getRoom.bind(roomsController)
  );

  router.post(
    '/join',
    authMiddleware,
    validate({
      body: joinRoomSchema,
    }),
    roomsController.joinRoom.bind(roomsController)
  );

  router.post(
    '/:roomId/leave',
    authMiddleware,
    validate({
      params: roomParamsSchema,
    }),
    roomsController.leaveRoom.bind(roomsController)
  );

  router.delete(
    '/:roomId',
    authMiddleware,
    validate({
      params: roomParamsSchema,
    }),
    roomsController.deleteRoom.bind(roomsController)
  );
}
