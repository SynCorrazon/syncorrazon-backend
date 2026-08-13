import { jest } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';

// Mock Firebase
const mockVerifyIdToken = jest.fn();

// Mock Rooms Repository
const mockRoomsRepository = {
  findActiveRoomByUser: jest.fn(),
  generateUniqueRoomCode: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByRoomCode: jest.fn(),
  update: jest.fn(),
  findByParticipant: jest.fn(),
  delete: jest.fn(),
};

// Mock Auth Repository (needed for auth middleware)
const mockAuthRepository = {
  findByUid: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  query: jest.fn(),
};

jest.unstable_mockModule('../config/firebase.js', () => ({
  auth: {
    verifyIdToken: mockVerifyIdToken,
  },
}));

jest.unstable_mockModule('../auth/auth.repo.js', () => ({
  AuthRepository: jest.fn().mockImplementation(() => mockAuthRepository),
}));

jest.unstable_mockModule('../rooms/rooms.repo.js', () => ({
  RoomsRepository: jest.fn().mockImplementation(() => mockRoomsRepository),
}));

const { createTestApp, mockUser, mockDatabaseUser } = await import('./mocks/utils/test-helpers.js');

describe('Rooms Controller Integration Tests', () => {
  let app: Express;
  const validToken = 'valid-firebase-token';
  const mockRoomId = 'room-123';
  const mockRoomCode = 'ABCDEF';

  const mockRoom = {
    id: mockRoomId,
    roomCode: mockRoomCode,
    creatorUid: mockUser.uid,
    participants: [mockUser.uid],
    videoUrl: 'https://youtube.com/watch?v=test',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();

    // Default auth mock - authenticated user
    mockVerifyIdToken.mockResolvedValue({
      uid: mockUser.uid,
      email: mockUser.email,
      name: mockUser.name,
      picture: mockUser.picture,
    });

    mockAuthRepository.findByUid.mockResolvedValue({
      ...mockDatabaseUser,
      uid: mockUser.uid,
    });
  });

  describe('POST /api/v1/rooms', () => {
    it('should create a room successfully', async () => {
      mockRoomsRepository.findActiveRoomByUser.mockResolvedValue(null);
      mockRoomsRepository.generateUniqueRoomCode.mockResolvedValue(mockRoomCode);
      mockRoomsRepository.create.mockResolvedValue(mockRoom);

      const response = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          videoUrl: 'https://youtube.com/watch?v=test',
        })
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockRoomId,
          roomCode: mockRoomCode,
          creatorUid: mockUser.uid,
          videoUrl: 'https://youtube.com/watch?v=test',
          isActive: true,
          participantCount: 1,
        }),
      });
    });

    it('should return 400 when user already has an active room', async () => {
      mockRoomsRepository.findActiveRoomByUser.mockResolvedValue(mockRoom);

      const response = await request(app)
        .post('/api/v1/rooms')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          videoUrl: 'https://youtube.com/watch?v=test',
        })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'User is already in an active room',
        code: 'BAD_REQUEST',
      });
    });

    it('should return 401 when not authenticated', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('No token'));

      const response = await request(app)
        .post('/api/v1/rooms')
        .send({
          videoUrl: 'https://youtube.com/watch?v=test',
        })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'No token provided',
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('GET /api/v1/rooms/:roomId', () => {
    it('should get room details successfully', async () => {
      mockRoomsRepository.findById.mockResolvedValue(mockRoom);

      const response = await request(app)
        .get(`/api/v1/rooms/${mockRoomId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockRoomId,
          roomCode: mockRoomCode,
          creatorUid: mockUser.uid,
          participants: [mockUser.uid],
          isActive: true,
        }),
      });
    });

    it('should return 404 when room not found', async () => {
      mockRoomsRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/v1/rooms/${mockRoomId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Room not found',
        code: 'NOT_FOUND',
      });
    });

    it('should return 403 when user is not a participant', async () => {
      const roomWithOtherUser = {
        ...mockRoom,
        participants: ['other-user-uid'],
      };
      mockRoomsRepository.findById.mockResolvedValue(roomWithOtherUser);

      const response = await request(app)
        .get(`/api/v1/rooms/${mockRoomId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'You are not a participant of this room',
        code: 'FORBIDDEN',
      });
    });

    it('should return 400 when room is inactive', async () => {
      mockRoomsRepository.findById.mockResolvedValue({
        ...mockRoom,
        isActive: false,
      });

      const response = await request(app)
        .get(`/api/v1/rooms/${mockRoomId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Room is no longer active',
        code: 'BAD_REQUEST',
      });
    });
  });

  describe('POST /api/v1/rooms/:roomId/join', () => {
    const joinRoomCode = 'JOI123';

    it('should join a room successfully', async () => {
      const joinRoomCode = '123456';
      const roomToJoin = {
        ...mockRoom,
        roomCode: joinRoomCode,
        participants: ['other-user'],
      };

      const updatedRoom = {
        ...roomToJoin,
        participants: ['other-user', mockUser.uid],
      };

      mockRoomsRepository.findByRoomCode.mockResolvedValue(roomToJoin);
      mockRoomsRepository.findActiveRoomByUser.mockResolvedValue(null);
      mockRoomsRepository.update.mockResolvedValue(updatedRoom);

      const response = await request(app)
        .post(`/api/v1/rooms/join`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ roomCode: joinRoomCode });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          roomCode: joinRoomCode,
          participants: ['other-user', mockUser.uid],
          participantCount: 2,
        }),
      });
    });

    it('should return 400 when roomCode is missing', async () => {
      const response = await request(app)
        .post(`/api/v1/rooms/join`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: '\"roomCode\" is required',
        code: 'BAD_REQUEST',
      });
    });

    it('should return 404 when room not found by code', async () => {
      mockRoomsRepository.findByRoomCode.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/rooms/join`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ roomCode: joinRoomCode })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Room not found',
        code: 'NOT_FOUND',
      });
    });

    it('should return 400 when room is inactive', async () => {
      mockRoomsRepository.findByRoomCode.mockResolvedValue({
        ...mockRoom,
        isActive: false,
      });

      const response = await request(app)
        .post(`/api/v1/rooms/join`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ roomCode: joinRoomCode })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'Room is no longer active',
        code: 'BAD_REQUEST',
      });
    });

    it('should return 400 when user is already in the room', async () => {
      mockRoomsRepository.findByRoomCode.mockResolvedValue(mockRoom);

      const response = await request(app)
        .post(`/api/v1/rooms/join`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ roomCode: mockRoomCode })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'You are already in this room',
        code: 'BAD_REQUEST',
      });
    });

    it('should return 400 when user is in another active room', async () => {
      const otherRoom = {
        ...mockRoom,
        id: 'other-room',
        participants: [mockUser.uid],
      };

      mockRoomsRepository.findByRoomCode.mockResolvedValue({
        ...mockRoom,
        participants: ['other-user'],
      });
      mockRoomsRepository.findActiveRoomByUser.mockResolvedValue(otherRoom);

      const response = await request(app)
        .post(`/api/v1/rooms/join`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ roomCode: joinRoomCode })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'You are already in another active room',
        code: 'BAD_REQUEST',
      });
    });
  });

  describe('POST /api/v1/rooms/:roomId/leave', () => {
    it('should leave a room successfully', async () => {
      const roomWithParticipants = {
        ...mockRoom,
        participants: [mockUser.uid, 'other-user'],
      };

      const updatedRoom = {
        ...roomWithParticipants,
        participants: ['other-user'],
        isActive: true,
      };

      mockRoomsRepository.findById.mockResolvedValue(roomWithParticipants);
      mockRoomsRepository.update.mockResolvedValue(updatedRoom);

      const response = await request(app)
        .post(`/api/v1/rooms/${mockRoomId}/leave`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: mockRoomId,
          participants: ['other-user'],
          participantCount: 1,
          isActive: true,
        }),
      });
    });

    it('should deactivate room when last participant leaves', async () => {
      mockRoomsRepository.findById.mockResolvedValue(mockRoom);
      mockRoomsRepository.update.mockResolvedValue({
        ...mockRoom,
        participants: [],
        isActive: false,
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${mockRoomId}/leave`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.isActive).toBe(false);
      expect(response.body.data.participantCount).toBe(0);
    });

    it('should return 404 when room not found', async () => {
      mockRoomsRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .post(`/api/v1/rooms/${mockRoomId}/leave`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Room not found',
        code: 'NOT_FOUND',
      });
    });

    it('should return 400 when user is not in the room', async () => {
      mockRoomsRepository.findById.mockResolvedValue({
        ...mockRoom,
        participants: ['other-user'],
      });

      const response = await request(app)
        .post(`/api/v1/rooms/${mockRoomId}/leave`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'You are not in this room',
        code: 'BAD_REQUEST',
      });
    });
  });

  describe('DELETE /api/v1/rooms/:roomId', () => {
    it('should delete a room successfully', async () => {
      mockRoomsRepository.findById.mockResolvedValue(mockRoom);
      mockRoomsRepository.update.mockResolvedValue({
        ...mockRoom,
        isActive: false,
      });

      const response = await request(app)
        .delete(`/api/v1/rooms/${mockRoomId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          message: 'Room deleted successfully',
        },
      });
    });

    it('should return 403 when user is not the creator', async () => {
      mockRoomsRepository.findById.mockResolvedValue({
        ...mockRoom,
        creatorUid: 'other-user-uid',
      });

      const response = await request(app)
        .delete(`/api/v1/rooms/${mockRoomId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body).toEqual({
        success: false,
        message: 'Only the room creator can delete this room',
        code: 'FORBIDDEN',
      });
    });

    it('should return 404 when room not found', async () => {
      mockRoomsRepository.findById.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/v1/rooms/${mockRoomId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Room not found',
        code: 'NOT_FOUND',
      });
    });
  });

  describe('GET /api/v1/rooms', () => {
    it('should get all rooms for a user', async () => {
      const userRooms = [
        mockRoom,
        {
          ...mockRoom,
          id: 'room-456',
          roomCode: 'GHIJKL',
          participants: [mockUser.uid, 'user2'],
        },
      ];

      mockRoomsRepository.findByParticipant.mockResolvedValue(userRooms);

      const response = await request(app)
        .get('/api/v1/rooms')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: mockRoomId,
            roomCode: mockRoomCode,
          }),
          expect.objectContaining({
            id: 'room-456',
            roomCode: 'GHIJKL',
          }),
        ]),
      });
    });

    it('should return empty array when user has no rooms', async () => {
      mockRoomsRepository.findByParticipant.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/rooms')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [],
      });
    });
  });
});
