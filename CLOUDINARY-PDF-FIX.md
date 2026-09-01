# Cloudinary PDF delivery fix

The supplied PDF URL is using `raw/upload` and Cloudinary is returning HTTP 401. A 401 from Cloudinary means delivery is being blocked by an access/security rule; it does not indicate that the file is missing.

## Immediate fix for existing PDFs
In Cloudinary Console, open **Settings → Security** and review **Restricted media types / PDF and archive delivery**. PDF delivery must be allowed for these assets to open directly through the CDN. Cloudinary documents 401s for restricted media delivery.

If the asset is intentionally private/authenticated, do not make it public; instead, generate signed/time-limited delivery URLs from the backend.

## Future PDF uploads
IRAAP now uploads PDFs as the `image` resource type instead of `raw`. Cloudinary treats PDFs as supported image assets, allowing standard PDF delivery and page rendering.

The existing database `fileUrl` values are not rewritten automatically. Existing `raw/upload` assets must either have PDF delivery enabled or be migrated/re-uploaded.
