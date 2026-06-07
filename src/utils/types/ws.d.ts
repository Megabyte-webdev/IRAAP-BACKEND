import { WebSocket } from "ws";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: "STUDENT" | "SUPERVISOR" | "ADMIN";
      };
    }
  }
}

export interface AuthedWebSocket extends WebSocket {
  userId?: number;
  userRole?: "STUDENT" | "SUPERVISOR" | "ADMIN";
}
