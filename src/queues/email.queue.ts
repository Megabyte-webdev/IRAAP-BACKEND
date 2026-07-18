import { Queue } from "bullmq";
import Redis from "ioredis";
import { redisConnection } from "../config/redis.js";

export const emailQueue = new Queue("send-email", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
  },
});

export const meetingReminderQueue = new Queue("meeting-reminder", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
  },
});
