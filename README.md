# SynCorrazon Backend

The API verifies Firebase ID tokens and owns profile and room data in Firestore. The browser sends a Firebase ID token in the `Authorization: Bearer <token>` header for every protected endpoint; the backend verifies it and stores profile/room data there. Passwords stay in Firebase Auth.

## Local setup

- Node.js 18+
- Firebase project with Authentication enabled and Firestore initialized
- Firebase Admin service-account credentials kept private

Copy `env.example` to `.env`, set `PORT`, `CORS_ORIGIN`, and your Firebase Admin values, then run:

```bash
npm ci
npm run dev
```

Use `GET /health` to confirm the server is running.

## Auth contract

- `POST /api/v1/auth` with `{ "idToken": "<Firebase ID token>" }` verifies the user and creates/updates the backend-owned profile.
- `GET /api/v1/auth/me` requires a valid Bearer ID token and returns the current profile.

## Room contract

All `/api/v1/rooms` routes are token-protected and return JSON in the documented `success/data` format.

- `POST /api/v1/rooms` with optional `{ "videoUrl": "https://youtu.be/..." }` creates a room.
- `GET /api/v1/rooms` lists the rooms the logged-in user belongs to.
- `GET /api/v1/rooms/:roomId` returns room details for a participant. The path may be the room document ID or the room code.
- `POST /api/v1/rooms/join` with `{ "roomCode": "ABC234" }` joins a room.
- `POST /api/v1/rooms/:roomId/leave` removes the user from a room.
- `DELETE /api/v1/rooms/:roomId` soft-deactivates a room; only the creator may delete it.

The room response includes `id`, `roomCode`, `creatorUid`, `participants`, optional `videoUrl`, `isActive`, `participantCount`, `createdAt`, and `updatedAt`. The total room count for a user should be filtered from the room list using `creatorUid`; the participant count is in `participantCount`.

## Security and deployment

- Firebase Auth remains the account identity layer; do not store passwords in backend-owned Firestore collections.
- Use Firebase Admin credentials only in host environment variables; do not commit `.env` or service account JSON.
- Set `CORS_ORIGIN` to the exact frontend origin and add that hostname to Firebase Authentication authorized domains.
- Restrict Firestore rules so the browser cannot directly write to `rooms` or `users`.
- Deploy the backend with `npm ci && npm run build`, then start with `npm start`.

## Known limits

The backend owns room metadata in Firestore, but peer-sync signaling and full multi-user sync logic are still not production-complete. The embedded YouTube player is also at the mercy of YouTube’s own embedding restrictions.
