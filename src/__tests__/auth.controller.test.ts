import { jest } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';

const mockVerifyIdToken = jest.fn();

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

const { createTestApp, mockUser, mockDatabaseUser } = await import('./mocks/utils/test-helpers.js');

describe('Auth Controller Integration Tests', () => {
  let app: Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });

  describe('POST /api/v1/auth', () => {
    it('should create a new user successfully', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: mockUser.uid,
        email: mockUser.email,
        name: mockUser.name,
        picture: mockUser.picture,
      });

      mockAuthRepository.findByUid.mockResolvedValue(null);

      mockAuthRepository.create.mockResolvedValue({
        ...mockDatabaseUser,
        uid: mockUser.uid,
      });

      const response = await request(app)
        .post('/api/v1/auth')
        .send({
          idToken: 'mock-firebase-token',
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: expect.objectContaining({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.name,
          photoURL: mockUser.picture,
        }),
      });

      expect(mockVerifyIdToken).toHaveBeenCalledWith('mock-firebase-token');

      expect(mockAuthRepository.findByUid).toHaveBeenCalledWith(mockUser.uid);

      expect(mockAuthRepository.create).toHaveBeenCalledWith({
        uid: mockUser.uid,
        email: mockUser.email,
        displayName: mockUser.name,
        photoURL: mockUser.picture,
      });
    });

    it('should login existing user successfully', async () => {
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

      const response = await request(app)
        .post('/api/v1/auth')
        .send({
          idToken: 'mock-firebase-token',
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      expect(mockAuthRepository.findByUid).toHaveBeenCalledWith(mockUser.uid);

      expect(mockAuthRepository.create).not.toHaveBeenCalled();
    });

    it('should return 400 when idToken is missing', async () => {
      const response = await request(app).post('/api/v1/auth').send({}).expect(400);

      expect(response.body).toEqual({
        success: false,
        message: 'ID token required',
        code: 'BAD_REQUEST',
      });

      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('should return 500 when Firebase token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid Firebase token'));

      const response = await request(app)
        .post('/api/v1/auth')
        .send({
          idToken: 'invalid-token',
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error',
      });
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user profile successfully', async () => {
      const token = 'valid-token';

      mockVerifyIdToken.mockResolvedValue({
        uid: mockUser.uid,
      });

      mockAuthRepository.findByUid.mockResolvedValue({
        ...mockDatabaseUser,
        uid: mockUser.uid,
      });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: expect.objectContaining({
          uid: mockUser.uid,
          email: mockUser.email,
          displayName: mockUser.name,
          photoURL: mockUser.picture,
        }),
      });

      expect(mockVerifyIdToken).toHaveBeenCalledWith(token);

      expect(mockAuthRepository.findByUid).toHaveBeenCalledWith(mockUser.uid);
    });

    it('should return 401 when authorization header is missing', async () => {
      const response = await request(app).get('/api/v1/auth/me').expect(401);

      expect(response.body).toEqual({
        success: false,
        message: 'No token provided',
        code: 'UNAUTHORIZED',
      });

      expect(mockVerifyIdToken).not.toHaveBeenCalled();
    });

    it('should return 500 when token verification fails', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Internal server error',
      });

      expect(mockVerifyIdToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should return null user when profile does not exist', async () => {
      mockVerifyIdToken.mockResolvedValue({
        uid: 'missing-user',
      });

      mockAuthRepository.findByUid.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        user: null,
      });

      expect(mockAuthRepository.findByUid).toHaveBeenCalledWith('missing-user');
    });
  });
});
