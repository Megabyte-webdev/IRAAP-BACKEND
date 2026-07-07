import { logger } from "../config/logger.js";
import type { AuthedWebSocket } from "./types/ws.js";

export function sendWsError(
  ws: AuthedWebSocket,
  code: string,
  message: string,
  requestId?: string,
) {
  if (ws.readyState !== ws.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "error",
      error: {
        code,
        message,
      },
      requestId,
      timestamp: new Date().toISOString(),
    }),
  );
}

export function sendWsSuccess(
  ws: AuthedWebSocket,
  type: string,
  payload: unknown,
) {
  if (ws.readyState !== ws.OPEN) return;

  ws.send(
    JSON.stringify({
      type,
      payload,
      timestamp: new Date().toISOString(),
    }),
  );
}

export async function execute(
  ws: AuthedWebSocket,
  action: string,
  handler: () => Promise<void>,
) {
  try {
    await handler();
  } catch (error) {
    logger.error({
      action,
      userId: ws.userId,
      error,
    });

    sendWsError(ws, "INTERNAL_ERROR", "Something went wrong.");
  }
}

export function safeSend(socket: AuthedWebSocket | undefined, data: unknown) {
  if (!socket) return;

  if (socket.readyState !== socket.OPEN) return;

  try {
    socket.send(JSON.stringify(data));
  } catch (err) {
    logger.warn(err);
  }
}
