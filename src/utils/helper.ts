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
