import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { getEmailData } from "../utils/email/engine.js";
import { sendEmail } from "../services/mail.js";

new Worker(
  "send-email",
  async (job) => {
    try {
      const { type, payload, to, senderType } = job.data;
      const sender = senderType || "system";
      const emailInfo = getEmailData(type, payload);

      if (!emailInfo) return;

      await sendEmail(to, emailInfo.subject, emailInfo.html, sender);
    } catch (err) {
      console.error("Email job failed:", err);
      throw err; // important so BullMQ can retry
    }
  },
  { connection: redisConnection },
);
