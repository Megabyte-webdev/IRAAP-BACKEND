import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import * as schema from "../database/schema.js";

dotenv.config();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL, //
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export async function testDbConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();
    console.log(" Database connected successfully");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
}

export const db = drizzle(pool, { schema });
