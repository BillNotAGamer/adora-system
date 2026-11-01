# Identity and access architecture

FastAPI is the source of truth for identity. The module separates HTTP transport (`router.py`),
Pydantic contracts (`schemas.py`), transactional use cases (`service.py`), SQLAlchemy persistence
(`repository.py`), cryptographic primitives (`security.py`), and authorization dependencies
(`dependencies.py`).

## Credentials and tokens

- Passwords use pwdlib's recommended Argon2id configuration. Plaintext passwords are never stored,
  returned, or included in validation errors/logs.
- Access JWTs default to 15 minutes and require verified `sub`, `iss`, `aud`, `iat`, `nbf`, `exp`,
  and `jti` claims. Validation pins HS256 and resolves the current user/roles from PostgreSQL.
- Refresh credentials are 48-byte URL-safe opaque tokens. Only SHA-256 digests are persisted.
- Refresh tokens default to seven days and rotate under a PostgreSQL row lock. A second use of a
  revoked token is treated as suspicious and revokes every currently active refresh session for
  that user.
- The baseline has no session-family column. Therefore family lineage is not claimed; the
  conservative all-active-session revocation policy is intentional and documented.
- Logout revokes the refresh session. Stateless access JWTs remain usable until their short expiry;
  there is no access-token denylist in Phase 1.1.

## Authorization

`get_current_principal` validates the access token, then reloads account status and roles from the
database. `require_roles` implements reusable RBAC. `require_partner_scope` requires the `partner`
role plus a matching `partner_memberships` row for the requested partner; the role alone grants no
cross-partner access. Administrators may explicitly override partner scope. Client-supplied user or
role values are never authoritative.

Public registration always grants only `traveler`; extra fields such as `role` are rejected. There
is no public administrator registration. To provision an initial administrator, invoke the local
command explicitly and enter a password through secure input (or the temporary environment value):

```powershell
services\api\.venv\Scripts\python.exe services/api/scripts/provision_admin.py `
  --email admin@example.com --display-name "ADORA Administrator" --confirm
```

The command refuses existing accounts, has no hardcoded password, never runs at startup, and relies
on production settings validation to reject unsafe secrets/cookies.

## Browser and mobile transport

Web login stores only the refresh credential in an HttpOnly cookie scoped to `/api/v1/auth`.
`Secure` is mandatory outside local environments, SameSite is explicit, and cookie refresh/logout
requires an allowed `Origin`. Access tokens remain in memory; the web helper never uses
`localStorage`. A same-origin Next.js BFF should be introduced with deployment topology if the web
and API use different sites.

Mobile requests receive the rotated refresh token in JSON and persist it only through Expo
SecureStore. Access tokens remain in process memory and travel in `Authorization: Bearer` headers.
AsyncStorage is not used for credentials.

Redis authentication limits use one atomic Lua `INCR`/`EXPIRE` operation and hashed subjects. If
Redis is unavailable, sensitive operations fail closed with 503. Security events are written to the
existing `audit_logs` table without passwords or tokens.
