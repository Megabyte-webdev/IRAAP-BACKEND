import { Worker } from "bullmq";
import Redis from "ioredis";
import { getEmailData } from "../utils/email/engine.js";
import { sendEmail } from "../services/mail.js";
import { redisOptions } from "../config/redis.js";
import Redis from "ioredis"; // Import Redis to create a fresh instance
new Worker(
  "send-email",
  async (job) => {
    const { type, payload, to } = job.data;
    console.log('processing', payload)

    const emailInfo = getEmailData(type, payload);

    if (!emailInfo) return;

    await sendEmail(to, emailInfo.subject, emailInfo.html);
  },
  { connection: new Redis.default(process.env.REDIS_URL, redisOptions) },
);
