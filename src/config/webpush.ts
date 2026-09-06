import webpush from "web-push";

const vapidEmail = process.env.VAPID_EMAIL;
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

export const pushConfigured = Boolean(vapidEmail && vapidPublicKey && vapidPrivateKey);

if (pushConfigured) {
  webpush.setVapidDetails(vapidEmail!, vapidPublicKey!, vapidPrivateKey!);
}

export default webpush;
