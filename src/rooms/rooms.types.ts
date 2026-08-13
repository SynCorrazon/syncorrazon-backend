import type { ParamsDictionary } from 'express-serve-static-core';

export interface Room {
  id: string;
  roomCode: string;
  creatorUid: string;
  participants: string[];
  videoUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
export type CreateRoomData = Omit<
  Room,
  'id' | 'participants' | 'isActive' | 'createdAt' | 'updatedAt'
>;

export interface CreateRoomDTO {
  videoUrl?: string;
}

export interface JoinRoomDTO {
  roomCode: string;
}

export interface RoomResponse {
  id: string;
  roomCode: string;
  creatorUid: string;
  participants: string[];
  videoUrl?: string | null;
  isActive: boolean;
  participantCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomParams extends ParamsDictionary {
  roomId: string;
}
