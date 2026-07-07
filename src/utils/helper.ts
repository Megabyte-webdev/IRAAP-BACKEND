export function buildMessageDTO(m: any, reply: any = null) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    content: m.content,
    status: m.status,
    createdAt: m.createdAt,

    replyTo: reply
      ? {
          id: reply.id,
          content: reply.content,
          senderId: reply.senderId,
          createdAt: reply.createdAt,
        }
      : null,
  };
}

export function buildMsgsDTO(message: any, reply: any = null) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    content: message.content,

    replyToMessageId: message.replyToMessageId,

    createdAt: message.createdAt,
    readAt: message.readAt,
    status: message.status,

    sender: message.sender,

    metadata:
      message.messageType === "CALL_INVITE"
        ? {
            messageType: message.messageType,
            meetingId: message.meetingId,
            meetingUrl: message.meetingUrl,
            scheduledAt: message.scheduledAt,
            duration: message.duration,
            meetingTitle: message.meetingTitle,
          }
        : {
            messageType: message.messageType,
          },

    replyTo: reply,
  };
}
