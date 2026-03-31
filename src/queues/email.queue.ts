import { Queue } from "bullmq";
import Redis from "ioredis";
import { redisConnection } from "../config/redis.js";

export const emailQueue = new Queue("send-email", {
  connection: redisConnection,
});
