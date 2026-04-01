import { Worker } from "bullmq";
import Redis from "ioredis";
import { getEmailData } from "../utils/email/engine.js";
import { sendEmail } from "../services/mail.js";
import { redisConnection } from "../config/redis.js";

new Worker(
  "send-email",
  async (job) => {
    const { type, payload, to } = job.data;
    console.log('processing', payload)

    const emailInfo = getEmailData(type, payload);

    if (!emailInfo) return;

    await sendEmail(to, emailInfo.subject, emailInfo.html);
  },
  { connection: redisConnection },
);
