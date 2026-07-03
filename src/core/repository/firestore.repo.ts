import admin from 'firebase-admin';

export abstract class FirestoreRepository<T, CreateDTO, UpdateDTO> {
  protected abstract readonly collectionName: string;

  protected get collection(): FirebaseFirestore.CollectionReference {
    return admin.firestore().collection(this.collectionName);
  }

  protected abstract toEntity(doc: FirebaseFirestore.DocumentData): T;
  protected abstract toCreateData(data: CreateDTO): FirebaseFirestore.DocumentData;
  protected abstract toUpdateData(data: UpdateDTO): FirebaseFirestore.DocumentData;

  async create(data: CreateDTO): Promise<T> {
    const docRef = this.collection.doc();
    await docRef.set(this.toCreateData(data));
    const doc = await docRef.get();
    return this.toEntity(doc);
  }

  async findById(id: string): Promise<T | null> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return this.toEntity(doc);
  }

  async update(id: string, data: UpdateDTO): Promise<T> {
    await this.collection.doc(id).update(this.toUpdateData(data));
    const doc = await this.collection.doc(id).get();
    return this.toEntity(doc);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  async findAll(): Promise<T[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => this.toEntity(doc));
  }

  async query(
    queryFn: (collection: FirebaseFirestore.CollectionReference) => FirebaseFirestore.Query
  ): Promise<T[]> {
    const query = queryFn(this.collection);
    const snapshot = await query.get();
    return snapshot.docs.map((doc) => this.toEntity(doc));
  }
}
