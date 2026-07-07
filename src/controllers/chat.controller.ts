import type { Request, Response } from "express";
import { and, desc, eq, lt, or, ne, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { conversations, messages, users } from "../database/schema.js";
import { withPagination } from "../utils/pagination.js";
import { buildMessagePreviewDTO, buildMsgsDTO } from "../utils/helper.js";

export async function getConversations(req: Request, res: Response) {
  const userId = req.user!.id;

  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const result = await withPagination({
    page,
    limit,

    dataQuery: (limit, offset) =>
      db.query.conversations.findMany({
        where: or(
          eq(conversations.supervisorId, userId),
          eq(conversations.studentId, userId),
        ),

        with: {
          supervisor: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },

          student: {
            columns: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },

          lastMessage: {
            columns: {
              id: true,
              content: true,
              status: true,
              senderId: true,
              createdAt: true,
              msgType: true,
              meetingId: true,
              meetingUrl: true,
              scheduledAt: true,
              duration: true,
            },
          },
        },

        orderBy: desc(conversations.updatedAt),

        limit,
        offset,
      }),

    countQuery: db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(conversations)
      .where(
        or(
          eq(conversations.supervisorId, userId),
          eq(conversations.studentId, userId),
        ),
      ),
  });

  const conversationsList = result.data.map((conversation) => ({
    id: conversation.id,

    participant:
      conversation.supervisorId === userId
        ? conversation.student
        : conversation.supervisor,

    lastMessage: conversation.lastMessage
      ? buildMessagePreviewDTO(conversation.lastMessage)
      : null,

    updatedAt: conversation.updatedAt,
  }));

  return res.json({
    data: conversationsList,
    pagination: result.pagination,
  });
}

export async function getChatableUsers(req: Request, res: Response) {
  const { id: userId, role } = req.user!;
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 50);

  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      supervisorId: true,
      role: true,
    },
  });
  let whereClause;

  if (role === "SUPERVISOR") {
    // Students under me + other supervisors
    whereClause = and(
      ne(users.id, userId),
      or(
        eq(users.supervisorId, userId),
        and(eq(users.role, "SUPERVISOR"), ne(users.id, userId)),
      ),
    );
  } else {
    // My supervisor + students sharing my supervisor
    whereClause = and(
      ne(users.id, userId),
      or(
        eq(users.id, currentUser!.supervisorId!),
        and(
          eq(users.supervisorId, currentUser!.supervisorId!),
          eq(users.role, "STUDENT"),
        ),
      ),
    );
  }

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

  const result = await withPagination({
    page,
    limit,

    dataQuery: (limit, offset) =>
      db.query.users.findMany({
        where: whereClause,
        columns: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
        orderBy: [users.fullName],
        limit,
        offset,
      }),

    countQuery: db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(whereClause),
  });

  const usersWithConversation = result.data.map((u) => ({
    ...u,
    conversationId: convoByPartner.get(u.id) ?? null,
  }));

  return res.json({
    data: usersWithConversation,
    pagination: result.pagination,
  });
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
          conversationId: true,
          senderId: true,
          content: true,
          msgType: true,
          meetingId: true,
          meetingUrl: true,
          replyToMessageId: true,
          duration: true,
          scheduledAt: true,
          readAt: true,
          createdAt: true,
          status: true,
        },
      },
    },
    orderBy: desc(messages.createdAt),
    limit: limit + 1,
  });

  const hasMore = msgs.length > limit;
  if (hasMore) msgs.pop();

  msgs.reverse();

  const formattedMessages = msgs.map((message) =>
    buildMsgsDTO(message, message.replyTo),
  );

  return res.json({
    data: formattedMessages,
    conversationId: convo.id,
    pagination: {
      hasMore,
      nextCursor: hasMore ? msgs[0].id : null,
    },
  });
}
