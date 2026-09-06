import webpush, { pushConfigured } from "../config/webpush.js";
import { db } from "../config/db.js";
import { eq } from "drizzle-orm";
import { pushSubscriptions } from "../database/schema.js";

export async function sendPushNotification({ receiverId, senderId, senderName, message, avatar, role }: any) {
  if (!pushConfigured) return;
  const subscriptions = await db.query.pushSubscriptions.findMany({ where: eq(pushSubscriptions.userId, receiverId) });
  for (const subscription of subscriptions) {
    try {
      const payload = JSON.stringify({
        title: senderName,
        body: message || "Sent you a message",
        icon: avatar || "/irap-logo.png",
        url: `/${role || "dashboard"}/chat/${senderId}`,
        tag: `chat-${senderId}`,
      });
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload);
    } catch (err: any) {
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
      } else {
        console.error("Push failed:", err?.message || err);
      }
    }
  }
}
