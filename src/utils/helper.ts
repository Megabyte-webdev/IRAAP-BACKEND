import { and, eq } from "drizzle-orm";
import { projects } from "../database/schema.js";
import { db } from "../config/db.js";
import type { Request, Response } from "express";
import type { AuthUser } from "./types/user.js";

export function buildMsgsDTO(message: any, reply: any = null) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,

    replyToMessageId: message.replyToMessageId,

    createdAt: message.createdAt,
    readAt: message.readAt,
    status: message.status,

    sender: message.sender,
    msgType: message.msgType,

    meeting:
      message.msgType === "CALL_INVITE"
        ? {
            msgType: message.msgType,
            id: message.meeting?.id,
            meetingId: message.meeting?.meetingId,
            title: message.meeting?.title,
            description: message.meeting?.description,
            meetingUrl: message.meeting?.meetingUrl,
            scheduledAt: message.meeting?.scheduledAt,
            duration: message.meeting?.duration,
          }
        : {
            msgType: message.msgType,
          },

    replyTo: reply,
  };
}

export function buildMessagePreviewDTO(message: any) {
  return {
    id: message.id,
    content: message.content,
    status: message.status,
    senderId: message.senderId,
    createdAt: message.createdAt,

    metadata:
      message.msgType === "CALL_INVITE"
        ? {
            msgType: message.msgType,
            meetingId: message.meetingId,
            meetingUrl: message.meetingUrl,
            scheduledAt: message.scheduledAt,
            duration: message.duration,
            meetingTitle: message.content,
          }
        : {
            msgType: message.msgType,
          },
  };
}

export function getReminderTimes(scheduleAt: Date) {
  const now = Date.now();

  const minutes = (scheduleAt.getTime() - now) / 60000;

  if (minutes > 1440) {
    // More than 1 day away
    return [1440, 60, 15];
  }

  if (minutes > 60) {
    // Between 1 hour and 1 day
    return [60, 15];
  }

  if (minutes > 15) {
    // Short notice
    return [15];
  }

  return [];
}

export const sanitizeString = (str: string): string => {
  if (!str) return "";
  return str.trim().replace(/[<>]/g, "").substring(0, 5000);
};

export const errorResponse = (
  res: Response,
  statusCode: number,
  message: string,
) => {
  return res.status(statusCode).json({ message });
};

export const getAuthUser = (req: Request): AuthUser | null => {
  const user = (req as any).user as AuthUser | undefined;
  return user && user.id ? user : null;
};

export const verifyProjectOwnership = async (
  projectId: number,
  studentId: number,
): Promise<boolean> => {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.studentId, studentId)),
    columns: { id: true },
  });
  return !!project;
};

export const generateMeetingUrl = (params: {
  meetingId: string;
  userName: string;
  hostName: string;
  meetingName: string;
  rolePath: "student" | "supervisor";
}) => {
  const query = new URLSearchParams({
    meetingId: params.meetingId ?? "",
    userName: params.userName,
    hostName: params.hostName,
    meetingName: params.meetingName ?? "",
  });

  const baseUrl = process.env.FRONTEND_URL || "https://iraap.com.ng";
  return `${baseUrl}/${params.rolePath}/waiting?${query.toString()}`;
};

export const extractItems = (
  data: string | string[] | null | undefined,
  targetSet: Set<string>,
) => {
  if (!data) return;

  const items = Array.isArray(data) ? data : data.split(",");

  items
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .forEach((item) => targetSet.add(item));
};
