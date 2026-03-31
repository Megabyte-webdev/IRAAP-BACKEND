import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import * as schema from "../database/schema.js";

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function testDbConnection() {
  try {
    const client = await pool.connect();
    await client.query("SELECT NOW()"); // simple test query
    client.release();
    console.log(" Database connected successfully");
  } catch (err) {
    console.error("Database connection failed:", err);
    process.exit(1); // exit app if db is critical
  }
}

export const db = drizzle(pool, { schema });
