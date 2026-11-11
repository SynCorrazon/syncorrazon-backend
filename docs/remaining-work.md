# SynCorrazon backend remaining work

## Current status
The backend repo is in a skeletal state:
- Express app is bootstrapped.
- CORS, security, compression, logger, and health checks exist.
- Socket.IO server is started.
- No room or auth APIs are implemented yet.

## Backend work still required

### Auth
- Add Firebase Admin verification for incoming frontend requests.
- Support the auth endpoints expected by the frontend (`/v1/auth` and `/v1/auth/me`).
- Add invalid-token and expired-token handling.

### Room lifecycle
- Create room API endpoints.
- Implement room join and leave routes.
- Enforce validation for missing or invalid room codes.
- Return consistent room payloads to the frontend.

### Real-time signaling
- Implement socket room management.
- Add `join-room`, `leave-room`, and `signal` handlers.
- Track participants by room and user id.
- Broadcast user join/leave and signal events.

### Sync and session state
- Define the room/session contract needed for live sync behavior.
- Decide whether the backend should track state or remain primarily signaling-only.
- Ensure real-time sync commands are routed correctly for pair-room sessions.

### Operational readiness
- Add route-level validation and structured errors.
- Log room actions and disconnects consistently.
- Add more resilient health and readiness endpoints.

## Dependency on frontend work
The backend cannot be considered complete without the frontend contract being finalized, especially:
- exact auth route shapes
- room payload schema
- UI-driven room code flow
- signaling events expected by `useWebRTC`

## Recommended next backend milestone
Build and validate the server contract first:
1. auth verification
2. room create/join/leave API
3. socket room + signaling flow
4. smoke test with frontend room flow

