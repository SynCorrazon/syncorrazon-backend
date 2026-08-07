import { BadRequestError, ForbiddenError, NotFoundError } from '../core/errors/custom-errors.js';
import type { RoomsRepository } from './rooms.repo.js';
import type { Room, CreateRoomDTO, RoomResponse } from './rooms.types.js';

export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  private toResponse(room: Room): RoomResponse {
    return {
      id: room.id,
      roomCode: room.roomCode,
      creatorUid: room.creatorUid,
      participants: room.participants,
      videoUrl: room.videoUrl,
      isActive: room.isActive,
      participantCount: room.participants.length,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  async createRoom(uid: string, data: CreateRoomDTO): Promise<RoomResponse> {
    // Check if user already has an active room
    const existingRoom = await this.roomsRepository.findActiveRoomByUser(uid);
    if (existingRoom) {
      throw new BadRequestError('User is already in an active room');
    }

    // Generate unique room code
    const roomCode = await this.roomsRepository.generateUniqueRoomCode();

    // Create room
    const room = await this.roomsRepository.create({
      ...data,
      roomCode,
      creatorUid: uid,
    });

    return this.toResponse(room);
  }

  async getRoom(roomId: string, uid: string): Promise<RoomResponse> {
    const room = await this.roomsRepository.findById(roomId);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    if (!room.isActive) {
      throw new BadRequestError('Room is no longer active');
    }

    // Check if user is a participant
    if (!room.participants.includes(uid)) {
      throw new ForbiddenError('You are not a participant of this room');
    }

    return this.toResponse(room);
  }

  async joinRoom(roomCode: string, uid: string): Promise<RoomResponse> {
    // Find room by code
    const room = await this.roomsRepository.findByRoomCode(roomCode);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    if (!room.isActive) {
      throw new BadRequestError('Room is no longer active');
    }

    // Check if user is already in this room
    if (room.participants.includes(uid)) {
      throw new BadRequestError('You are already in this room');
    }

    // Check if user is in another active room
    const existingRoom = await this.roomsRepository.findActiveRoomByUser(uid);
    if (existingRoom) {
      throw new BadRequestError('You are already in another active room');
    }

    // Add user to participants
    const updatedRoom = await this.roomsRepository.update(room.id, {
      participants: [...room.participants, uid],
    });

    if (!updatedRoom) {
      throw new NotFoundError('Failed to update room');
    }

    return this.toResponse(updatedRoom);
  }

  async leaveRoom(roomId: string, uid: string): Promise<RoomResponse> {
    const room = await this.roomsRepository.findById(roomId);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    if (!room.participants.includes(uid)) {
      throw new BadRequestError('You are not in this room');
    }

    // Remove user from participants
    const updatedParticipants = room.participants.filter((p) => p !== uid);

    // If room is empty after leaving, deactivate it
    const updates: Partial<Room> = {
      participants: updatedParticipants,
      isActive: updatedParticipants.length > 0,
    };

    const updatedRoom = await this.roomsRepository.update(room.id, updates);

    if (!updatedRoom) {
      throw new NotFoundError('Failed to update room');
    }

    return this.toResponse(updatedRoom);
  }

  async deleteRoom(roomId: string, uid: string): Promise<void> {
    const room = await this.roomsRepository.findById(roomId);

    if (!room) {
      throw new NotFoundError('Room not found');
    }

    // Only creator can delete
    if (room.creatorUid !== uid) {
      throw new ForbiddenError('Only the room creator can delete this room');
    }

    // Soft delete by marking as inactive
    await this.roomsRepository.update(roomId, {
      isActive: false,
    });
  }

  async getUserRooms(uid: string): Promise<RoomResponse[]> {
    const rooms = await this.roomsRepository.findByParticipant(uid);
    return rooms.map((room) => this.toResponse(room));
  }
}
