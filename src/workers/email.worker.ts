import { Worker } from "bullmq";
import { redisConnection } from "../config/redis.js";
import { getEmailData } from "../utils/email/engine.js";
import { sendEmail } from "../services/mail.js";

new Worker(
  "send-email",
  async (job) => {
    console.log("Processing email job:", job.data);
    try {
      const { type, payload, to, senderType } = job.data;
      const emailInfo = getEmailData(type, payload);

      if (!emailInfo) return;

      await sendEmail(to, emailInfo.subject, emailInfo.html, senderType);
    } catch (err) {
      console.error("Email job failed:", err);
      throw err; // important so BullMQ can retry
    }
  },
  { connection: redisConnection },
);
