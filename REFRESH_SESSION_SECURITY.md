# IRAAP Refresh Session Security

- Access JWT lifetime: 15 minutes.
- Refresh inactivity lifetime: 30 days (sliding).
- Hard maximum session lifetime: 90 days.
- Refresh tokens are rotated on every successful refresh.
- Only SHA-256 refresh-token hashes are stored in PostgreSQL.
- Refresh sessions use a family ID for reuse detection.
- PostgreSQL advisory transaction locks serialize concurrent refreshes for the same session family.
- Logout revokes the current refresh token record.
- Reuse of a revoked refresh token revokes the entire session family.
- Refresh-token cookies are HttpOnly and Secure in production.

## Migration

Run `src/database/2026-09-05-refresh-session-hardening.sql` against the production database before or during the application deployment. Existing plaintext refresh tokens are hashed once and the plaintext column is removed by the migration.

Existing refresh JWTs remain limited by the expiry with which they were originally signed. Users with a valid legacy token receive the new sliding-session behavior at their next refresh.
