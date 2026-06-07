import type { Request, Response } from "express";
import { and, desc, eq, lt, or, ne, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { conversations, messages, users } from "../database/schema.js";

export async function getConversations(req: Request, res: Response) {
  const userId = req.user!.id;

  const userConvos = await db.query.conversations.findMany({
    where: or(
      eq(conversations.supervisorId, userId),
      eq(conversations.studentId, userId),
    ),
    with: {
      supervisor: {
        columns: { id: true, fullName: true, email: true, role: true },
      },
      student: {
        columns: { id: true, fullName: true, email: true, role: true },
      },
      messages: {
        orderBy: desc(messages.createdAt),
        limit: 1,
        columns: {
          id: true,
          content: true,
          status: true,
          senderId: true,
          createdAt: true,
        },
      },
    },
    orderBy: desc(conversations.updatedAt),
  });

  // Get unread counts in one query — messages sent by someone else that aren't READ
  const unreadCounts = await db
    .select({
      conversationId: messages.conversationId,
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(messages)
    .where(
      and(
        or(...userConvos.map((c) => eq(messages.conversationId, c.id))),
        ne(messages.senderId, userId),
        ne(messages.status, "READ"),
      ),
    )
    .groupBy(messages.conversationId);

  const unreadMap = Object.fromEntries(
    unreadCounts.map((r) => [r.conversationId, r.count]),
  );

  const result = userConvos.map((convo) => {
    // The "other" participant from the current user's perspective
    const participant =
      convo.supervisorId === userId ? convo.student : convo.supervisor;

    return {
      id: convo.id,
      participant,
      lastMessage: convo.messages[0] ?? null,
      unreadCount: unreadMap[convo.id] ?? 0,
      updatedAt: convo.updatedAt,
    };
  });

  return res.json({ data: result });
}

export async function getChatableUsers(req: Request, res: Response) {
  const { id: userId, role } = req.user!;

  // Existing conversations
  const existingConvos = await db.query.conversations.findMany({
    where: or(
      eq(conversations.supervisorId, userId),
      eq(conversations.studentId, userId),
    ),
    columns: {
      id: true,
      supervisorId: true,
      studentId: true,
    },
  });

  const convoByPartner = new Map<number, number>();

  for (const c of existingConvos) {
    const partnerId = c.supervisorId === userId ? c.studentId : c.supervisorId;

    convoByPartner.set(partnerId, c.id);
  }

  let chatableUsers: any[] = [];

  if (role === "STUDENT") {
    const me = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        supervisorId: true,
      },
    });

    if (!me?.supervisorId) {
      return res.json({ data: [] });
    }

    chatableUsers = await db.query.users.findMany({
      where: and(
        ne(users.id, userId),
        or(
          // my supervisor
          eq(users.id, me.supervisorId),

          // students under same supervisor
          and(
            eq(users.role, "STUDENT"),
            eq(users.supervisorId, me.supervisorId),
          ),
        ),
      ),
      columns: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: [users.fullName],
    });
  }

  if (role === "SUPERVISOR") {
    chatableUsers = await db.query.users.findMany({
      where: and(
        ne(users.id, userId),
        or(
          // my students
          eq(users.supervisorId, userId),

          // other supervisors
          eq(users.role, "SUPERVISOR"),
        ),
      ),
      columns: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: [users.fullName],
    });
  }

  const result = chatableUsers.map((u) => ({
    ...u,
    conversationId: convoByPartner.get(u.id) ?? null,
  }));

  return res.json({ data: result });
}

export async function getChatUserById(
  req: Request<{ userId: string }>,
  res: Response,
) {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, fullName: true, email: true, role: true },
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({ data: user });
}

// GET /chat/conversations/:conversationId/messages
// Paginated message history for an open conversation.
// Uses cursor-based pagination (before=messageId) so new messages
// don't shift pages as the user scrolls up — same as WhatsApp/Telegram.
//
// Query params:
//   limit  — how many messages to return (default 30, max 50)
//   before — message id cursor; returns messages older than this id
export async function getMessages(
  req: Request<{ userId: string }>,
  res: Response,
) {
  if (!req.params.userId)
    return res.status(400).json({ error: "Missing userId parameter" });

  const currentUserId = req.user!.id;
  const otherUserId = parseInt(req.params.userId);

  if (isNaN(otherUserId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  if (otherUserId === currentUserId) {
    return res.status(400).json({ error: "Cannot get messages with yourself" });
  }

  // Resolve the conversation between these two users
  const convo = await db.query.conversations.findFirst({
    where: or(
      and(
        eq(conversations.supervisorId, currentUserId),
        eq(conversations.studentId, otherUserId),
      ),
      and(
        eq(conversations.supervisorId, otherUserId),
        eq(conversations.studentId, currentUserId),
      ),
    ),
  });

  // No conversation yet — return empty state, not an error
  // The first message sent via WS will create it
  if (!convo) {
    return res.json({
      data: [],
      pagination: { hasMore: false, nextCursor: null },
    });
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 30, 50);
  const before = req.query.before ? parseInt(req.query.before as string) : null;

  const msgs = await db.query.messages.findMany({
    where: and(
      eq(messages.conversationId, convo.id),
      before ? lt(messages.id, before) : undefined,
    ),
    with: {
      sender: {
        columns: { id: true, fullName: true, role: true },
      },
      replyTo: {
        with: {
          sender: {
            columns: { id: true, fullName: true, role: true },
          },
        },
        columns: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
        },
      },
    },
    orderBy: desc(messages.createdAt),
    limit: limit + 1,
  });

  const hasMore = msgs.length > limit;
  if (hasMore) msgs.pop();

  // Chronological order — oldest first for rendering
  msgs.reverse();

  return res.json({
    data: msgs,
    // Surface the conversationId so the client can use it for chat:read:bulk
    conversationId: convo.id,
    pagination: {
      hasMore,
      nextCursor: hasMore ? msgs[0].id : null,
    },
  });
}
