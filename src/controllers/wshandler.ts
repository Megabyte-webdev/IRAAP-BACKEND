import { and, eq, inArray, or } from "drizzle-orm";
import type { AuthedWebSocket } from "../utils/types/ws.js";
import type { ClientMessage } from "../utils/types/websocket.js";
import { conversations, messages, users } from "../database/schema.js";
import { clients } from "../services/ws.js";
import { db } from "../config/db.js";
import { buildMessageDTO } from "../utils/helper.js";
import { sendPushNotification } from "../utils/pusher.js";

export async function handleMessage(ws: AuthedWebSocket, raw: string) {
  try {
    const msg: ClientMessage = JSON.parse(raw);

    switch (msg.type) {
      case "chat:send":
        return handleChatSend(ws, msg);

      case "chat:read":
        return handleRead(ws, msg);

      case "chat:read:bulk":
        return handleReadBulk(ws, msg);

      case "chat:typing":
        return handleTyping(ws, msg);
    }
  } catch (err) {
    console.error("Invalid WS message:", err);
  }
}

// SEND
async function handleChatSend(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:send" }>,
) {
  if (!ws.userId) return;

  const recipient = await db.query.users.findFirst({
    where: eq(users.id, msg.recipientId),
  });
  if (!recipient) return;

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

  // INSERT ONLY (no re-query)
  const [saved] = (await db
    .insert(messages)
    .values({
      conversationId: convo.id,
      senderId: ws.userId,
      content: msg.content,
      replyToMessageId: msg.replyToMessageId ?? null,
      status: "SENT",
    })
    .returning()) as any;

  // CONDITIONAL reply fetch (only if needed)
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
  }

  await db
    .update(conversations)
    .set({ lastMessageId: saved.id, updatedAt: new Date() })
    .where(eq(conversations.id, convo.id));

  const payload = buildMessageDTO(saved, reply);

  // ACK sender
  ws.send(
    JSON.stringify({
      type: "chat:message:sent",
      payload: { ...payload, clientId: msg.clientId },
    }),
  );

  const recipientSocket = clients.get(msg.recipientId);
  const recipientRole = recipientSocket?.userRole;

  if (recipientSocket) {
    recipientSocket.send(
      JSON.stringify({
        type: "chat:message",
        payload,
      }),
    );

    await sendPushNotification({
      senderId: payload.senderId,
      receiverId: msg.recipientId,
      senderName: ws.fullName,
      message: msg.content,
      avatar: null,
      role: recipientRole?.toLocaleLowerCase(),
    });

    await db
      .update(messages)
      .set({ status: "DELIVERED" })
      .where(eq(messages.id, saved.id));

    ws.send(
      JSON.stringify({
        type: "chat:delivered",
        payload: {
          messageId: saved.id,
          conversationId: convo.id,
          deliveredTo: msg.recipientId,
        },
      }),
    );
  }
}

// READ (single message)
async function handleRead(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:read" }>,
) {
  if (!ws.userId) return;

  // Client tells us who sent the message — no DB lookup needed
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
  senderSocket?.send(
    JSON.stringify({
      type: "chat:read",
      payload: {
        messageId: msg.messageId,
        readerId: ws.userId, // ← who read it
      },
    }),
  );
}

// ─── READ BULK ───────────────────────────────────────────────────────────────

async function handleReadBulk(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:read:bulk" }>,
) {
  if (!ws.userId) return;
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
  senderSocket?.send(
    JSON.stringify({
      type: "chat:read:bulk",
      payload: {
        conversationId: msg.conversationId,
        messageIds: ids,
        readerId: ws.userId, // ← who read them
      },
    }),
  );
}

// TYPING INDICATOR
async function handleTyping(
  ws: AuthedWebSocket,
  msg: Extract<ClientMessage, { type: "chat:typing" }>,
) {
  if (!ws.userId) return;

  const recipientSocket = clients.get(msg.recipientId);
  recipientSocket?.send(
    JSON.stringify({
      type: "chat:typing",
      payload: { senderId: ws.userId, isTyping: msg.isTyping },
    }),
  );
}

// FLUSH PENDING MESSAGES  — call this right after a user connects.
// Delivers every SENT message they missed while offline, then marks DELIVERED.
export async function flushPendingMessages(ws: AuthedWebSocket) {
  if (!ws.userId) return;

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
  ws.send(
    JSON.stringify({
      type: "chat:messages:bulk",
      payload: toDeliver.map((m) => buildMessageDTO(m, m.replyTo)),
    }),
  );

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

    socket.send(
      JSON.stringify({
        type: "chat:delivered:bulk",
        messageIds,
      }),
    );
  }
}
