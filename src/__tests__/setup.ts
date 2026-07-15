import { jest } from '@jest/globals';

// Mock Firebase
jest.mock('../config/firebase.js', () => ({
  auth: {
    verifyIdToken: jest.fn(),
  },
}));

// Mock Firestore (if needed)
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(),
}));

// Global test timeout
jest.setTimeout(30000);
