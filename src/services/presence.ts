import { or, eq } from "drizzle-orm";
import { clients } from "../services/ws.js";
import { db } from "../config/db.js";
import { conversations, users } from "../database/schema.js";
import type { AuthedWebSocket } from "../utils/types/ws.js";

/**
 * Resolve everyone this user *could* chat with — not just who they've
 * already messaged. Logic mirrors your conversation creation rules:
 *   - STUDENT  → all SUPERVISOR accounts
 *   - SUPERVISOR → all STUDENT accounts
 *   - anything else → fall back to conversation partners only
 */
async function getChatablePartnerIds(
  userId: number,
  userRole: string,
): Promise<number[]> {
  if (userRole === "STUDENT") {
    const supervisors = await db.query.users.findMany({
      where: eq(users.role, "SUPERVISOR"),
      columns: { id: true },
    });
    return supervisors.map((u) => u.id).filter((id) => id !== userId);
  }

  if (userRole === "SUPERVISOR") {
    const students = await db.query.users.findMany({
      where: eq(users.role, "STUDENT"),
      columns: { id: true },
    });
    return students.map((u) => u.id).filter((id) => id !== userId);
  }

  // Fallback: use existing conversations (keeps things working for other roles)
  const userConvos = await db.query.conversations.findMany({
    where: or(
      eq(conversations.supervisorId, userId),
      eq(conversations.studentId, userId),
    ),
  });

  return userConvos
    .map((c) => (c.supervisorId === userId ? c.studentId : c.supervisorId))
    .filter((id) => id !== userId);
}

/**
 * Broadcast this user's online/offline status to every user they can chat with.
 * Called on WS connect (online) and WS close (offline).
 */
export async function broadcastPresence(
  userId: number,
  userRole: string,
  status: "online" | "offline",
) {
  const partnerIds = await getChatablePartnerIds(userId, userRole);

  const payload = JSON.stringify({
    type: "chat:presence",
    payload: { userId, status },
  });

  for (const partnerId of partnerIds) {
    clients.get(partnerId)?.send(payload);
  }
}

/**
 * Respond to a client asking "who among my contacts is online right now?"
 * Client sends: { type: "chat:presence:list" }
 * Returns only IDs currently in the clients map.
 */
export async function handlePresenceList(ws: AuthedWebSocket) {
  if (!ws.userId || !ws.userRole) return;

  const partnerIds = await getChatablePartnerIds(ws.userId, ws.userRole);
  const onlineIds = partnerIds.filter((id) => clients.has(id));

  ws.send(
    JSON.stringify({
      type: "chat:presence:list",
      payload: { onlineUserIds: onlineIds },
    }),
  );
}
