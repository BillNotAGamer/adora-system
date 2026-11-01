# Authentication API contract

Base path: `/api/v1/auth`. FastAPI OpenAPI is authoritative; regenerate TypeScript with
`pnpm api:generate` after contract changes.

| Method/path | Purpose | Success |
|---|---|---|
| `POST /register` | Normalize email, validate policy, create user + traveler role | `201` user |
| `POST /login` | Verify credentials/status and issue access + refresh session | `200` tokens/user |
| `POST /refresh` | Lock, validate, revoke, and rotate a refresh session | `200` tokens/user |
| `POST /logout` | Revoke the supplied refresh session | `204` |
| `GET /me` | Return the current database-backed identity | `200` user |

Registration accepts only `email`, `password`, and `display_name`; unknown fields are rejected.
Passwords require 12–128 characters with lowercase, uppercase, numeric, and symbol characters.
User responses contain only ID, normalized email, display name, status, roles, and verification
state. Email remains unverified because Phase 1.1 does not implement delivery/verification.

Login uses `client_type: "web" | "mobile"`. Web responses set an HttpOnly refresh cookie and omit
the refresh token body. Mobile responses return it for immediate SecureStore persistence. Refresh
accepts a mobile body token or the web cookie and performs rotation. Error responses use the shared
`{"error":{"code","message","details"}}` envelope; credential failures do not distinguish unknown
email from wrong password. Validation details omit raw input values.

Protected requests use `Authorization: Bearer <access-token>`. The access token alone is not used as
the authorization database: account status, roles, and partner membership are reloaded for current
decisions.
