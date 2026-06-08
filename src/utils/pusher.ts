import webpush from "../config/webpush.js";
import { getSubscription } from "./pushStore.js";

export async function sendPushNotification({
  receiverId,
  senderId,
  senderName,
  message,
  avatar,
  role,
}) {
  const subscription = getSubscription(receiverId);

  if (!subscription) return;

  const payload = JSON.stringify({
    title: senderName,
    body: message,
    icon: avatar || "/irap-logo.png",
    url: `/${role}/chat/${senderId}`,
    tag: `chat-${senderId}`,
  });

  try {
    await webpush.sendNotification(subscription, payload);
  } catch (err) {
    console.error("Push failed:", err);
  }
}
