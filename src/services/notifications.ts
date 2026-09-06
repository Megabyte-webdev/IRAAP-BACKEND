import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "../config/db.js";
import { notifications, pushSubscriptions, users } from "../database/schema.js";
import webpush, { pushConfigured } from "../config/webpush.js";

export type NotificationInput = {
  userId: number;
  organizationId?: number | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function createNotification(input: NotificationInput) {
  const [notification] = await db.insert(notifications).values({
    ...input,
    metadata: input.metadata ?? null,
  }).returning();

  await pushUser(input.userId, {
    title: input.title,
    body: input.message,
    link: input.link || "/dashboard",
    tag: `${input.type}-${notification.id}`,
  });

  return notification;
}

export async function createNotifications(inputs: NotificationInput[]) {
  if (!inputs.length) return [];
  const created = await db.insert(notifications).values(inputs.map((input) => ({
    ...input,
    metadata: input.metadata ?? null,
  }))).returning();
  for (const item of inputs) {
    await pushUser(item.userId, {
      title: item.title,
      body: item.message,
      link: item.link || "/dashboard",
      tag: `${item.type}-${Date.now()}-${item.userId}`,
    });
  }
  return created;
}

async function pushUser(userId: number, payload: { title: string; body: string; link: string; tag: string }) {
  if (!pushConfigured) return;
  const subscriptions = await db.query.pushSubscriptions.findMany({
    where: eq(pushSubscriptions.userId, userId),
  });
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, JSON.stringify({ ...payload, icon: "/irap-logo.png", url: payload.link }));
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscription.id));
      } else {
        console.warn("Push notification failed:", error?.message || error);
      }
    }
  }
}

export async function notifyAdmins(input: Omit<NotificationInput, "userId" | "organizationId"> & { organizationId?: number | null }) {
  const admins = await db.query.users.findMany({ where: eq(users.role, "ADMIN"), columns: { id: true } });
  return createNotifications(admins.map((admin) => ({ ...input, userId: admin.id })));
}

export async function listNotifications(userId: number, limit = 30) {
  return db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
    orderBy: [desc(notifications.createdAt)],
    limit,
  });
}

export async function markNotificationRead(userId: number, notificationId: number) {
  const [row] = await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning();
  return row;
}

export async function markAllNotificationsRead(userId: number) {
  await db.update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}
