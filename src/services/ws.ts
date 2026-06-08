import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { db } from "../config/db.js";
import { eq } from "drizzle-orm";
import type { AuthedWebSocket } from "../utils/types/ws.js";
import { users } from "../database/schema.js";
import {
  handleMessage,
  flushPendingMessages,
} from "../controllers/wshandler.js";
import { broadcastPresence, handlePresenceList } from "./presence.js";

type ClientMap = Map<number, AuthedWebSocket>;
export const clients: ClientMap = new Map();

export function initWebSocket(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: AuthedWebSocket, req) => {
    try {
      const url = new URL(req.url || "", "http://localhost");
      const token = url.searchParams.get("token");

      if (!token) {
        ws.close(4001, "No token");
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
        id: number;
      };

      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.id),
      });

      if (!user) {
        ws.close(4002, "Invalid user");
        return;
      }

      ws.userId = user.id;
      ws.userRole = user.role;
      ws.fullName = user.fullName;

      // Close stale socket — but mark it so its close handler
      // does NOT broadcast offline (we're immediately replacing it)
      const existing = clients.get(user.id);
      if (existing && existing !== ws) {
        (existing as any)._replaced = true;
        existing.close(4010, "Replaced by newer connection");
      }

      clients.set(user.id, ws);
      console.log(`WS connected: ${user.id} (${user.role})`);

      // Wrap async work so an error here doesn't crash the connection handler
      try {
        await broadcastPresence(user.id, user.role, "online");
      } catch (err) {
        console.error("[WS] broadcastPresence error:", err);
      }

      try {
        await flushPendingMessages(ws);
      } catch (err) {
        console.error("[WS] flushPendingMessages error:", err);
      }

      ws.on("message", async (data) => {
        try {
          const raw = data.toString();
          const parsed = JSON.parse(raw);
          if (parsed.type === "chat:presence:list") {
            return handlePresenceList(ws);
          }
          handleMessage(ws, raw);
        } catch (err) {
          console.error("[WS] message handler error:", err);
        }
      });

      ws.on("close", async (code, reason) => {
        console.log(
          `WS close: ${user.id} code=${code} reason=${reason?.toString()}`,
        );

        // Don't broadcast offline if this socket was replaced by a newer one
        if ((ws as any)._replaced) return;

        if (clients.get(user.id) === ws) {
          clients.delete(user.id);
          try {
            await broadcastPresence(user.id, user.role, "offline");
          } catch (err) {
            console.error("[WS] offline broadcastPresence error:", err);
          }
        }
      });
    } catch (err) {
      console.error("[WS] connection handler error:", err);
      ws.close(4003, "Auth failed");
    }
  });
}
