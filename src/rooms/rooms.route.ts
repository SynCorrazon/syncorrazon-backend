export { RoomsController } from './rooms.controller.js';

export { RoomsRepository } from './rooms.repo.js';

export type { Room, CreateRoomDTO, JoinRoomDTO, RoomResponse } from './rooms.types.js';

import { Router } from 'express';
import { registerRoomRoutes, RoomsController } from './rooms.controller.js';

import { RoomsRepository } from './rooms.repo.js';
import { RoomsService } from './rooms.service.js';

export function createRoomsRouter(): Router {
  const router = Router();
  const roomsRepository = new RoomsRepository();
  const roomsService = new RoomsService(roomsRepository);
  const roomsController = new RoomsController(roomsService);
  registerRoomRoutes(router, roomsController);
  return router;
}
