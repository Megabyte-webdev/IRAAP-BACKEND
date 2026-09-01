# Profile, onboarding and PWA

## Backend

Run the new Drizzle migration (`0003_profile.sql`) in production.

Mount `profile.routes.ts` on `/api/profile` in the main Express server:

```ts
import profileRoutes from "./routes/profile.routes.js";
app.use("/api/profile", profileRoutes);
```

The profile image endpoint is `POST /api/profile/me/image` and accepts a JPG, PNG or WebP up to 5MB. Profile data is `PATCH /api/profile/me`.

## Frontend

After signup OTP verification, the user is sent to `/<role>/profile?onboarding=1`. The profile page lets them complete academic information and upload a photo; they can skip and return later.

The PWA manifest is exposed by Next.js at `/manifest.webmanifest`. The service worker is `/sw.js`.

## Required profile fields

Full name, department, programme and level are required for profile completion. The photo, phone number, matric number, academic session and bio are optional.
