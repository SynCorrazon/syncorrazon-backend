import { FirestoreRepository } from '../core/repository/firestore.repo.js';
import type { User } from './auth.types.js';

export class AuthRepository extends FirestoreRepository<User, any, any> {
  protected readonly collectionName = 'users';

  protected toEntity(doc: any): User {
    const data = doc.data();
    return {
      uid: data.uid,
      email: data.email,
      displayName: data.displayName,
      photoURL: data.photoURL,
      createdAt: data.createdAt?.toDate?.() || new Date(),
    };
  }

  protected toCreateData(data: any): any {
    return {
      ...data,
      createdAt: new Date(),
    };
  }

  protected toUpdateData(data: any): any {
    return data;
  }

  async findByUid(uid: string): Promise<User | null> {
    const results = await this.query((collection) => collection.where('uid', '==', uid).limit(1));
    return results.length > 0 ? results[0] : null;
  }
}
