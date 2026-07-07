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
      message.msgType === "CALL_INVITE"
        ? {
            msgType: message.msgType,
            meetingId: message.meetingId,
            meetingUrl: message.meetingUrl,
            scheduledAt: message.scheduledAt,
            duration: message.duration,
            meetingTitle: message.meetingTitle,
          }
        : {
            msgType: message.msgType,
          },

    replyTo: reply,
  };
}
