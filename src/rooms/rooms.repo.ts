import { FirestoreRepository } from '../core/repository/firestore.repo.js';
import type { Room, CreateRoomDTO, CreateRoomData } from './rooms.types.js';

export class RoomsRepository extends FirestoreRepository<Room, CreateRoomData, Partial<Room>> {
  protected readonly collectionName = 'rooms';

  protected toEntity(doc: any): Room {
    const data = doc.data();
    return {
      id: doc.id,
      roomCode: data.roomCode,
      creatorUid: data.creatorUid,
      participants: data.participants || [],
      videoUrl: data.youtubeUrl || null,
      isActive: data.isActive ?? true,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    };
  }

  protected toCreateData(data: CreateRoomDTO & { roomCode: string; creatorUid: string }): any {
    return {
      ...data,
      participants: [data.creatorUid],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  protected toUpdateData(data: Partial<Room>): any {
    return {
      ...data,
      updatedAt: new Date(),
    };
  }

  async findByRoomCode(roomCode: string): Promise<Room | null> {
    const results = await this.query((collection) =>
      collection.where('roomCode', '==', roomCode).limit(1)
    );
    return results.length > 0 ? results[0] : null;
  }

  async findByParticipant(uid: string): Promise<Room[]> {
    return this.query((collection) =>
      collection.where('participants', 'array-contains', uid).where('isActive', '==', true)
    );
  }

  async findActiveRoomByUser(uid: string): Promise<Room | null> {
    const rooms = await this.findByParticipant(uid);
    return rooms.length > 0 ? rooms[0] : null;
  }

  async generateUniqueRoomCode(): Promise<string> {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }

      const existing = await this.findByRoomCode(code);
      if (!existing) {
        return code;
      }
      attempts++;
    }

    throw new Error('Failed to generate unique room code');
  }
}
