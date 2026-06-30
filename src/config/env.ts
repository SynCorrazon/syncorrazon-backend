import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  nodeEnv: string;
  port: number;
  corsOrigin: string;
  firebase: {
    projectId: string;
    privateKey: string;
    clientEmail: string;
  };
}

const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'CORS_ORIGIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_CLIENT_EMAIL',
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
  },
};

export default config;
