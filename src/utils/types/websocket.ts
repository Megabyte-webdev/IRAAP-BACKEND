// ─── Client → Server ─────────────────────────────────────────────────────────

export type ChatSendMessage = {
  type: "chat:send";
  recipientId: number;
  content: string;
  clientId: string;
  replyToMessageId?: number;
};

export type ChatReadMessage = {
  type: "chat:read";
  messageId: number[];
  senderId: number; // who sent the message — avoids a DB lookup server-side
};

/** Client opens a conversation → mark all messages from a specific user as read */
export type ChatReadBulkMessage = {
  type: "chat:read:bulk";
  conversationId: number;
  senderId: number; // whose messages we are marking as read
};

export type ChatTypingMessage = {
  type: "chat:typing";
  recipientId: number;
  isTyping: boolean;
};

export type ClientMessage =
  | ChatSendMessage
  | ChatReadMessage
  | ChatReadBulkMessage
  | ChatTypingMessage;

// ─── Server → Client ─────────────────────────────────────────────────────────

export type MessagePayload = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  status: "SENT" | "DELIVERED" | "READ";
  createdAt: Date;
};

export type ServerMessage =
  | {
      /** Incoming message from another user */
      type: "chat:message";
      payload: MessagePayload;
    }
  | {
      /** Ack to sender — message saved to DB */
      type: "chat:message:sent";
      payload: MessagePayload;
    }
  | {
      /** Recipient received the message */
      type: "chat:delivered";
      messageId: number;
    }
  | {
      /** Single message was read — includes who read it */
      type: "chat:read";
      payload: {
        messageId: number;
        conversationId: number;
        readerId: number; // ← the user who read it
      };
    }
  | {
      /** All messages in a conversation were read at once */
      type: "chat:read:bulk";
      payload: {
        conversationId: number;
        messageIds: number[];
        readerId: number; // ← the user who read them
      };
    }
  | {
      /** Typing indicator */
      type: "chat:typing";
      payload: { senderId: number; isTyping: boolean };
    };
