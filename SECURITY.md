# IRAAP authentication/security hardening

## Required environment variables

- `JWT_SECRET`: strong, random access-token signing secret.
- `JWT_REFRESH_SECRET`: separate strong, random refresh-token signing secret.
- `OTP_PEPPER`: separate strong random secret used to hash OTPs.
- `RESEND_API_KEY`: email provider credential.
- `REDIS_URL`: required for distributed rate limiting and existing queues.

## Authentication flow

1. Registration creates an unverified student account and sends a 6-digit email OTP.
2. Login validates the password and sends a login OTP. No access or refresh token is issued before successful OTP verification.
3. OTPs expire after 10 minutes, are hashed at rest, allow five incorrect attempts, and are single-use.
4. Resend is throttled for 60 seconds per active challenge and rate limited through Redis.
5. Refresh tokens are rotated: the previously used refresh token is deleted when a new one is issued.
6. Logout revokes the refresh token and clears the HttpOnly cookie.
7. Access tokens are kept in browser memory rather than `localStorage`; only non-sensitive user data is persisted locally for session restoration.

## Database

Run the new `drizzle/0002_auth_otp.sql` migration in production before enabling the updated authentication routes.
