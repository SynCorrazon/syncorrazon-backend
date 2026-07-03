import { auth } from '../config/firebase.js';
import type { AuthRepository } from './auth.repo.js';
import type { User } from './auth.types.js';

export class AuthService {
  constructor(private authRepository: AuthRepository) {}

  async authenticate(idToken: string): Promise<User> {
    // Verify Firebase token
    const decoded = await auth.verifyIdToken(idToken);

    // Check if user exists
    let user = await this.authRepository.findByUid(decoded.uid);

    if (!user) {
      // Create new user
      user = await this.authRepository.create({
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name,
        photoURL: decoded.picture,
      });
    }

    return user;
  }

  async getProfile(uid: string): Promise<User | null> {
    return this.authRepository.findByUid(uid);
  }
}
