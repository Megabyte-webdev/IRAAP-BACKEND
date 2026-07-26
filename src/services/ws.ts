import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import type { AuthedWebSocket } from "../utils/types/ws.js";
import {
  handleMessage,
  flushPendingMessages,
} from "../controllers/wshandler.js";
import { broadcastPresence, handlePresenceList } from "./presence.js";

type ClientMap = Map<number, AuthedWebSocket>;
interface JWTPayload {
  id: number;
  role: "STUDENT" | "SUPERVISOR" | "ADMIN";
  fullName: string;
  email: string;
}
export const clients: ClientMap = new Map();

export function initWebSocket(server: any) {
  const wss = new WebSocketServer({ server });
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const socket = ws as any;

      if (socket.isAlive === false) {
        console.log("[WS] terminating dead socket");
        return ws.terminate();
      }

      socket.isAlive = false;
      ws.ping();
    });
  }, 30000);
  wss.on("connection", async (ws: AuthedWebSocket, req) => {
    const socket = ws as any;

    socket.isAlive = true;

    ws.on("pong", () => {
      socket.isAlive = true;
    });

    try {
      const url = new URL(req.url || "", "http://localhost");
      const token = url.searchParams.get("token");

      if (!token) {
        ws.close(4001, "No token provided");
        return;
      }

      // 1. INLINE JWT VERIFICATION BLOCK
      let decoded: JWTPayload;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      } catch (jwtErr: any) {
        console.warn(`[WS] Auth Rejected: ${jwtErr.message}`);
        const closeCode = jwtErr.name === "TokenExpiredError" ? 4401 : 4403;
        ws.close(closeCode, jwtErr.message);
        return;
      }

      ws.userId = decoded.id;
      ws.userRole = decoded.role;
      ws.fullName = decoded.fullName;
      ws.email = decoded.email;

      // Close stale socket — but mark it so its close handler
      // does NOT broadcast offline (we're immediately replacing it)
      const existing = clients.get(decoded.id);
      if (existing && existing !== ws) {
        (existing as any)._replaced = true;
        existing.close(4010, "Replaced by newer connection");
      }

      clients.set(decoded.id, ws);
      console.log(`WS connected: ${decoded.id} (${decoded.role})`);

      // Wrap async work so an error here doesn't crash the connection handler
      try {
        await broadcastPresence(decoded.id, decoded.role, "online");
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
          `WS close: ${decoded.id} code=${code} reason=${reason?.toString()}`,
        );

        // Don't broadcast offline if this socket was replaced by a newer one
        if ((ws as any)._replaced) return;

        if (clients.get(decoded.id) === ws) {
          clients.delete(decoded.id);
          try {
            await broadcastPresence(decoded.id, decoded.role, "offline");
          } catch (err) {
            console.error("[WS] offline broadcastPresence error:", err);
          }
        }
      });
    } catch (err) {
      // Catches generic internal server issues (like database connection drops)
      console.error("[WS] Unexpected connection handler internal error:", err);
      ws.close(1011, "Internal server error");
    }
  });

  wss.on("close", () => {
    clearInterval(heartbeat);
  });
}
