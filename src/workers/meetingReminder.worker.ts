import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { db } from "../config/db.js";
import { messages } from "../database/schema.js";
import { eq } from "drizzle-orm";
import { sendEmail } from "../services/mail.js";
import { getEmailData } from "../utils/email/engine.js";

const worker = new Worker(
  "meeting-reminder",
  async (job) => {
    console.log("Processing meeting reminder:", job.data);

    try {
      const {
        messageId,
        email,
        recipientName,
        recipientType,
        supervisorName,
        meetingTitle,
        meetingUrl,
        scheduledAt,
        reminderMinutes,
      } = job.data;

      // 1. Verify message still exists & isn't canceled
      const message = await db.query.messages.findFirst({
        where: eq(messages.id, messageId),
      });

      if (!message || message.msgType !== "CALL_INVITE") {
        console.log(
          `Meeting message ${messageId} no longer exists or canceled`,
        );
        return;
      }

      if ((message as any).status === "CANCELLED") {
        console.log(`Meeting ${messageId} was cancelled`);
        return;
      }

      // 2. Build email payload directly from job.data (preserves dynamic user-specific meetingUrl)
      const payload = {
        recipientName,
        supervisorName,
        meetingTitle,
        meetingUrl, // <--- Per-user URL passed from queue job
        scheduledAt: scheduledAt || message.createdAt,
        recipientRole: recipientType,
        reminderMinutes,
      };

      const emailInfo = getEmailData("MEETING_REMINDER", payload);

      if (!emailInfo) return;

      // 3. Send email to the designated recipient's email address
      await sendEmail(email, emailInfo.subject, emailInfo.html, "system");
    } catch (err) {
      console.error("Meeting reminder failed:", err);
      throw err;
    }
  },
  {
    connection: redisConnection,
  },
);

worker.on("completed", (job) => {
  console.log("Reminder completed", job.id);
});

worker.on("failed", (job, err) => {
  console.error("Reminder failed", job?.id, err);
});
