// In your global declaration file (e.g., src/types/express.d.ts)
import 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
        name?: string;
        picture?: string;
        [key: string]: any;
      };
    }
  }
}

export {};
