import type { Request, Response } from "express";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "../config/db.js";
import { notifications, pushSubscriptions } from "../database/schema.js";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../services/notifications.js";
import { errorResponse } from "../utils/helper.js";
import { pushConfigured } from "../config/webpush.js";

export const getPushPublicKey = async (_req: Request, res: Response) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();

  if (!publicKey || !pushConfigured) {
    return errorResponse(res, 503, "Web push notifications are not configured");
  }

  return res.json({
    success: true,
    publicKey,
  });
};

export const getNotifications = async (req: Request, res: Response) => {
  const userId = Number((req as any).user?.id);
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 30, 1), 100);
    const [items, unread] = await Promise.all([
      listNotifications(userId, limit),
      db
        .select({ count: count() })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            isNull(notifications.readAt),
          ),
        ),
    ]);
    return res.json({
      notifications: items,
      unreadCount: Number(unread[0]?.count || 0),
    });
  } catch (error) {
    console.error("getNotifications error", error);
    return errorResponse(res, 500, "Unable to load notifications");
  }
};

export const readNotification = async (req: Request, res: Response) => {
  const userId = Number((req as any).user?.id);
  const id = Number(req.params.id);
  if (!id) return errorResponse(res, 400, "Invalid notification id");
  try {
    const row = await markNotificationRead(userId, id);
    if (!row) return errorResponse(res, 404, "Notification not found");
    return res.json({ success: true, notification: row });
  } catch (error) {
    console.error("readNotification error", error);
    return errorResponse(res, 500, "Unable to mark notification as read");
  }
};

export const readAllNotifications = async (req: Request, res: Response) => {
  const userId = Number((req as any).user?.id);
  try {
    await markAllNotificationsRead(userId);
    return res.json({ success: true });
  } catch (error) {
    console.error("readAllNotifications error", error);
    return errorResponse(res, 500, "Unable to mark notifications as read");
  }
};

export const subscribeToPush = async (req: Request, res: Response) => {
  const userId = Number((req as any).user?.id);
  const subscription = req.body?.subscription;

  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return errorResponse(res, 400, "Invalid push subscription");
  }

  try {
    const existing = await db.query.pushSubscriptions.findFirst({
      where: eq(pushSubscriptions.endpoint, subscription.endpoint),
    });

    if (existing) {
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existing.id));
    } else {
      await db.insert(pushSubscriptions).values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        updatedAt: new Date(),
      });
    }

    return res.status(201).json({ success: true });
  } catch (error) {
    console.error("subscribeToPush error", error);
    return errorResponse(res, 500, "Unable to save notification subscription");
  }
};

export const unsubscribeFromPush = async (req: Request, res: Response) => {
  const userId = Number((req as any).user?.id);
  const endpoint = String(req.body?.endpoint || "");
  if (!endpoint) return errorResponse(res, 400, "Push endpoint is required");

  try {
    await db
      .delete(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.endpoint, endpoint),
        ),
      );
    return res.json({ success: true });
  } catch (error) {
    console.error("unsubscribeFromPush error", error);
    return errorResponse(res, 500, "Unable to remove notification subscription");
  }
};
