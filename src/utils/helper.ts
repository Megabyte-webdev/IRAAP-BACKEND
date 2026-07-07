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

export function buildMessagePreviewDTO(message: any) {
  return {
    id: message.id,
    content: message.content,
    status: message.status,
    senderId: message.senderId,
    createdAt: message.createdAt,

    metadata:
      message.msgType === "CALL_INVITE"
        ? {
            msgType: message.msgType,
            meetingId: message.meetingId,
            meetingUrl: message.meetingUrl,
            scheduledAt: message.scheduledAt,
            duration: message.duration,
            meetingTitle: message.content,
          }
        : {
            msgType: message.msgType,
          },
  };
}

export function getReminderTimes(scheduleAt: Date) {
  const now = Date.now();

  const minutes = (scheduleAt.getTime() - now) / 60000;

  if (minutes > 1440) {
    // More than 1 day away
    return [1440, 60, 15];
  }

  if (minutes > 60) {
    // Between 1 hour and 1 day
    return [60, 15];
  }

  if (minutes > 15) {
    // Short notice
    return [15];
  }

  return [];
}
