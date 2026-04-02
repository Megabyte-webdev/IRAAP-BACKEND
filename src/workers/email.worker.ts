import { Worker } from "bullmq";
import Redis from "ioredis";
import { getEmailData } from "../utils/email/engine.js";
import { sendEmail } from "../services/mail.js";
import { redisOptions } from "../config/redis.js";

const workerConnection = new Redis(process.env.REDIS_URL, redisOptions);

// 2. Add an error listener so it doesn't fail silently
workerConnection.on('error', (err) => {
  console.error('Worker Redis Connection Error:', err.message);
});
new Worker(
  "send-email",
  async (job) => {
    const { type, payload, to } = job.data;
    console.log('processing', payload)

    const emailInfo = getEmailData(type, payload);

    if (!emailInfo) return;

    await sendEmail(to, emailInfo.subject, emailInfo.html);
  },
  { connection: workerConnection},
);
