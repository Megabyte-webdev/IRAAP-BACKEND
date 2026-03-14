import { db } from "../config/db.js";
import { users } from "./schema.js";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("OOU_CPE_2026", 10);

  const supervisorData = [
    {
      fullName: "Mr. O.R Abolade",
      email: "orabolade@oouagoiwoye.edu.ng",
      password: hashedPassword,
      role: "SUPERVISOR" as const,
    },
    // You can add more departmental staff here
  ];

  try {
    await db.insert(users).values(supervisorData);
    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
  }
  process.exit();
}

seed();
