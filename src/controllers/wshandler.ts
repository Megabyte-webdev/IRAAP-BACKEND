import { and, eq, inArray, or } from "drizzle-orm";
import type { AuthedWebSocket } from "../utils/types/ws.js";
import type { ClientMessage } from "../utils/types/websocket.js";
import { conversations, messages, users } from "../database/schema.js";
import { clients } from "../services/ws.js";
import { db } from "../config/db.js";
import { buildMessageDTO } from "../utils/helper.js";
import { sendPushNotification } from "../utils/pusher.js";
import { execute, safeSend, sendWsError } from "../utils/ws-response.js";
import { createMeeting } from "../services/meetingsdk.js";

export async function handleMessage(ws: AuthedWebSocket, raw: string) {
  let msg: ClientMessage;
  try {
    msg = JSON.parse(raw);
  } catch {
    return sendWsError(ws, "INVALID_JSON", "Malformed websocket payload.");
  }

  switch (msg.type) {
    case "ping":
      return safeSend(ws, {
        type: "pong",
        timestamp: new Date().toISOString(),
      });

    case "chat:send":
      return execute(ws, "chat:send", () => handleChatSend(ws, msg));

    case "chat:read":
      return execute(ws, "chat:read", () => handleRead(ws, msg));

    case "chat:read:bulk":
      return execute(ws, "chat:read:bulk", () => handleReadBulk(ws, msg));

    case "chat:typing":
      return execute(ws, "chat:typing", () => handleTyping(ws, msg));

    default:
      return sendWsError(
        ws,
        "UNKNOWN_EVENT",
        `Unsupported event type: ${(msg as any).type}`,
      );
  }
}

// SEND
async function handleChatSend(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:send" }>,
) {
  if (!ws.userId) {
    return sendWsError(ws, "UNAUTHORIZED", "Authentication required.");
  }

  const recipient = await db.query.users.findFirst({
    where: eq(users.id, msg.recipientId),
  });

  if (!recipient) {
    return sendWsError(ws, "RECIPIENT_NOT_FOUND", "Recipient does not exist.");
  }
  const content = msg.content?.trim() ?? "";
  const msgType = msg.metadata?.msgType ?? "TEXT";

  // Text messages require content
  if (msgType === "TEXT" && !content) {
    return sendWsError(ws, "EMPTY_MESSAGE", "Message cannot be empty.");
  }

  if (content.length > 5000) {
    return sendWsError(
      ws,
      "MESSAGE_TOO_LONG",
      "Message exceeds maximum length.",
    );
  }

  let convo = await db.query.conversations.findFirst({
    where: or(
      and(
        eq(conversations.supervisorId, ws.userId),
        eq(conversations.studentId, msg.recipientId),
      ),
      and(
        eq(conversations.supervisorId, msg.recipientId),
        eq(conversations.studentId, ws.userId),
      ),
    ),
  });

  if (!convo) {
    convo = await db
      .insert(conversations)
      .values({
        supervisorId:
          ws.userRole === "SUPERVISOR" ? ws.userId : msg.recipientId,
        studentId: ws.userRole === "STUDENT" ? ws.userId : msg.recipientId,
      })
      .returning()
      .then((r) => r[0]);
  }

  let meetingId: null | string = null;
  let meetingUrl: null | string = null;

  if (msgType === "CALL_INVITE") {
    if (ws.userRole !== "SUPERVISOR") {
      return sendWsError(
        ws,
        "FORBIDDEN",
        "Only supervisors can schedule meetings.",
      );
    }

    const meeting = await createMeeting({
      title: msg.metadata?.meetingTitle ?? `Meeting with ${recipient.fullName}`,
      createdBy: String(ws.userId),
      isOpen: msg.metadata?.isOpen ?? true,
    });

    meetingId = meeting.id;
    meetingUrl = `${process.env.MEETING_APP_URL}/${meetingId}`;
  }

  const [saved] = (await db
    .insert(messages)
    .values({
      conversationId: convo.id,
      senderId: ws.userId,
      content,
      msgType,
      meetingId,
      meetingUrl,
      replyToMessageId: msg.replyToMessageId ?? null,
      status: "SENT",
    })
    .returning()) as any;

  let reply = null;

  if (msg.replyToMessageId) {
    reply = await db.query.messages.findFirst({
      where: eq(messages.id, msg.replyToMessageId),
      columns: {
        id: true,
        content: true,
        senderId: true,
        createdAt: true,
      },
    });
    if (!reply) {
      return sendWsError(ws, "INVALID_REPLY", "Reply message not found.");
    }
  }
  await db
    .update(conversations)
    .set({
      lastMessageId: saved.id,

      updatedAt: new Date(),
    })
    .where(eq(conversations.id, convo.id));
  const payload = {
    ...buildMessageDTO(saved, reply),
    metadata:
      msgType === "CALL_INVITE"
        ? {
            scheduledAt: msg.metadata?.scheduledAt,
            duration: msg.metadata?.duration,
            meetingTitle: msg.metadata?.meetingTitle,
            meetingUrl: meetingUrl,
          }
        : null,
  };

  // sender acknowledgement
  safeSend(ws, {
    type: "chat:message:sent",
    payload: {
      ...payload,
      clientId: msg.clientId,
    },
  });
  const recipientSocket = clients.get(msg.recipientId);

  if (recipientSocket) {
    safeSend(recipientSocket, {
      type: "chat:message",
      payload,
    });
    try {
      await sendPushNotification({
        senderId: payload.senderId,
        receiverId: msg.recipientId,
        senderName: ws.fullName,
        message: content,
        avatar: null,
        role: recipientSocket.userRole?.toLowerCase(),
      });
    } catch (error) {
      console.warn(error);
    }
    await db
      .update(messages)
      .set({
        status: "DELIVERED",
      })
      .where(eq(messages.id, saved.id));
    safeSend(ws, {
      type: "chat:delivered",
      payload: {
        messageId: saved.id,
        conversationId: convo.id,
        deliveredTo: msg.recipientId,
      },
    });
  }
}

// READ (single message)
async function handleRead(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:read" }>,
) {
  if (!ws.userId)
    return sendWsError(ws, "UNAUTHORIZED", "Authentication required.");

  if (msg.senderId === ws.userId) return; // can't read your own message

  await db
    .update(messages)
    .set({ status: "READ", readAt: new Date() })
    .where(
      and(
        eq(messages.id, msg.messageId),
        eq(messages.senderId, msg.senderId), // safety: ensure it really is from that sender
      ),
    );

  // Tell the sender their message was read and by whom
  const senderSocket = clients.get(msg.senderId);
  safeSend(senderSocket, {
    type: "chat:read",
    payload: {
      messageId: msg.messageId,
      readerId: ws.userId,
    },
  });
}

// READ BULK
async function handleReadBulk(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:read:bulk" }>,
) {
  if (!ws.userId)
    return sendWsError(ws, "UNAUTHORIZED", "Authentication required.");
  if (msg.senderId === ws.userId) return; // sanity guard

  // Only mark messages from the specified sender in this conversation
  const unread = await db.query.messages.findMany({
    where: and(
      eq(messages.conversationId, msg.conversationId),
      eq(messages.senderId, msg.senderId),
    ),
  });

  const toMark = unread.filter(
    (m) => m.status === "SENT" || m.status === "DELIVERED",
  );

  if (toMark.length === 0) return;

  const ids = toMark.map((m) => m.id);

  await db
    .update(messages)
    .set({ status: "READ", readAt: new Date() })
    .where(inArray(messages.id, ids));

  // Notify the sender — include readerId so they know who read them
  const senderSocket = clients.get(msg.senderId);
  safeSend(senderSocket, {
    type: "chat:read:bulk",
    payload: {
      conversationId: msg.conversationId,
      messageIds: ids,
      readerId: ws.userId,
    },
  });
}

// TYPING INDICATOR
async function handleTyping(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:typing" }>,
) {
  if (!ws.userId)
    return sendWsError(ws, "UNAUTHORIZED", "Authentication required.");

  const recipientSocket = clients.get(msg.recipientId);
  safeSend(recipientSocket, {
    type: "chat:typing",
    payload: { senderId: ws.userId, isTyping: msg.isTyping },
  });
}

// FLUSH PENDING MESSAGES  — call this right after a user connects.
// Delivers every SENT message they missed while offline, then marks DELIVERED.
export async function flushPendingMessages(ws: AuthedWebSocket) {
  if (!ws.userId)
    return sendWsError(ws, "UNAUTHORIZED", "Authentication required.");

  const userConvos = await db.query.conversations.findMany({
    where: or(
      eq(conversations.supervisorId, ws.userId),
      eq(conversations.studentId, ws.userId),
    ),
  });

  if (userConvos.length === 0) return;

  const convoIds = userConvos.map((c) => c.id);

  const pending = await db.query.messages.findMany({
    where: and(
      inArray(messages.conversationId, convoIds),
      // SENT = saved but never pushed to client
      // DELIVERED = pushed but socket dropped before client confirmed receipt
      or(eq(messages.status, "SENT"), eq(messages.status, "DELIVERED")),
    ),
    with: {
      replyTo: {
        columns: {
          id: true,
          content: true,
          senderId: true,
          createdAt: true,
        },
      },
    },
  });

  const toDeliver = pending.filter((m) => m.senderId !== ws.userId);
  if (toDeliver.length === 0) return;

  // Push all missed messages in one frame
  safeSend(ws, {
    type: "chat:messages:bulk",
    payload: toDeliver.map((m) => buildMessageDTO(m, m.replyTo)),
  });

  const ids = toDeliver.map((m) => m.id);

  await db
    .update(messages)
    .set({ status: "DELIVERED" })
    .where(inArray(messages.id, ids));

  // Notify each original sender their messages were delivered
  const bySender = toDeliver.reduce<Record<number, number[]>>((acc, m) => {
    (acc[m.senderId] ??= []).push(m.id);
    return acc;
  }, {});

  for (const [senderId, messageIds] of Object.entries(bySender)) {
    const socket = clients.get(Number(senderId));
    if (!socket) continue;

    safeSend(socket, {
      type: "chat:delivered:bulk",
      messageIds,
    });
  }
}
