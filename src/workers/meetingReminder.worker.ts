import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { db } from "../config/db.js";
import { messages } from "../database/schema.js";
import { eq } from "drizzle-orm";
import { sendEmail } from "../services/mail.js";
import { getEmailData } from "../utils/email/engine.js";

new Worker(
  "meeting-reminder",
  async (job) => {
    console.log("Processing meeting reminder:", job.data);

    try {
      const { messageId, recipientType } = job.data;

      const message = await db.query.messages.findFirst({
        where: eq(messages.id, messageId),
        with: {
          sender: true,
          receiver: true,
          columns: {
            id: true,
            content: true,
            msgType: true,
            meetingUrl: true,
            duration: true,
            scheduledAt: true,
            status: true,
          },
        },
      });

      // Message deleted
      if (!message || message.msgType !== "CALL_INVITE") {
        console.log(`Meeting message ${messageId} no longer exists`);
        return;
      }

      // Optional: if you have status
      if (message.status === "cancelled") {
        console.log(`Meeting ${messageId} cancelled`);
        return;
      }

      const payload = {
        recipientName: message.receiver.fullName,
        supervisorName: message.sender.fullName,
        meetingTitle: message.content,
        meetingUrl: message.meetingUrl,
        scheduledAt: message.scheduleAt,
        recipientRole: recipientType,
      };

      const emailInfo = getEmailData("MEETING_REMINDER", payload);

      if (!emailInfo) return;

      await sendEmail(
        message.receiver.email,
        emailInfo.subject,
        emailInfo.html,
        "system",
      );
    } catch (err) {
      console.error("Meeting reminder failed:", err);

      throw err;
    }
  },
  {
    connection: redisConnection,
  },
);
