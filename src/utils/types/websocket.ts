export type ChatSendMessage = {
  type: "chat:send";
  recipientId: number;
  content: string;
  clientId: string;
  replyToMessageId?: number;
  metadata?: {
    messageType?: "TEXT" | "CALL_INVITE" | "IMAGE" | "VIDEO" | "FILE";
    scheduledAt?: string;
    duration?: number;
    meetingTitle?: string;
    [key: string]: any;
  };
};
export type ChatReadMessage = {
  type: "chat:read";
  messageId: number[];
  senderId: number;
};

export type ChatReadBulkMessage = {
  type: "chat:read:bulk";
  conversationId: number;
  senderId: number;
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
  | ChatTypingMessage
  | {
      type: "ping";
    };

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
      type: "chat:message";
      payload: MessagePayload;
    }
  | {
      type: "chat:message:sent";
      payload: MessagePayload;
    }
  | {
      type: "chat:delivered";
      messageId: number;
    }
  | {
      type: "chat:read";
      payload: {
        messageId: number;
        conversationId: number;
        readerId: number;
      };
    }
  | {
      type: "chat:read:bulk";
      payload: {
        conversationId: number;
        messageIds: number[];
        readerId: number;
      };
    }
  | {
      type: "chat:typing";
      payload: { senderId: number; isTyping: boolean };
    };
