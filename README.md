# SynCorrazon backend

Firebase-authenticated API for SynCorrazon watch rooms. Firebase Authentication remains the identity provider; Firestore stores room metadata and membership. Passwords and Firebase service-account credentials are never stored in this repository.

## Run locally

1. Install Node.js 18+ and npm.
2. In Firebase Console, create/select the project, enable Authentication providers used by the frontend, and create a Firestore database.
3. Create a Firebase service account with the minimum Firestore access needed. Keep its credentials private.
4. Copy `env.example` to `.env`, set the Firebase service-account values, and set `CORS_ORIGIN=http://localhost:3000` (add any other exact origins as comma-separated values).
5. Run `npm ci`, then `npm run dev`. The API listens on port 3000 by default; `GET /health` checks availability.

## API

Every `/api/v1` endpoint other than health requires `Authorization: Bearer <Firebase ID token>`. The API verifies tokens with Firebase Admin SDK.

- `GET /api/v1/auth/me` — current verified account UID/email.
- `POST /api/v1/rooms` with `{ "videoUrl": "https://youtu.be/VIDEO_ID" }` — create a room.
- `GET /api/v1/rooms` — list rooms the account belongs to.
- `GET /api/v1/rooms/:roomCode` — retrieve room metadata for a member.
- `POST /api/v1/rooms/join` with `{ "roomCode": "ABC234" }` — join a room (two participants maximum).
- `POST /api/v1/rooms/:roomCode/leave` — leave without deleting the user's account.

Room records are stored in Firestore's `rooms` collection. Do not expose service-account credentials or disable Firestore security controls. Configure Firestore rules to deny direct client writes to `rooms`; only this trusted backend should write room membership.

## Deployment

Deploy the Node service (for example, Render) with `npm ci` and `npm run build`; start with `npm start`. Configure `NODE_ENV`, `PORT` (provided by host), `CORS_ORIGIN` (the exact deployed frontend origin), `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY` (preserve newlines or use `\n`), and `FIREBASE_CLIENT_EMAIL` as host-side secrets/environment settings. Never commit `.env` or service-account JSON.

The Socket.IO server is currently initialized, but peer signaling/playback relay is not implemented here; room creation, membership, and room metadata APIs are implemented. YouTube embedding availability remains subject to YouTube's restrictions and each video's owner settings.
