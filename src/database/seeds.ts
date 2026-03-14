import { db } from "../config/db.js";
import { users } from "./schema.js";
import bcrypt from "bcrypt";

export async function seed() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("OOU_CPE_2026", 10);
  const hashedPassword2 = await bcrypt.hash("afowebdev", 10);
  const hashedPassword3 = await bcrypt.hash("megabyteweb", 10);
  const supervisorData = [
    {
      fullName: "Mr. O.R Abolade",
      email: "orabolade@oouagoiwoye.edu.ng",
      password: hashedPassword,
      role: "SUPERVISOR" as const,
    },
    {
      fullName: "Mr. G.M. Afolabi",
      email: "afolabimubarak18@gmail.com",
      password: hashedPassword2,
      role: "STUDENT" as const,
    },
    {
      fullName: "Mr. Megabyte Web",
      email: "megabytewebnew@gmail.com",
      password: hashedPassword3,
      role: "ADMIN" as const,
    },
  ];

  try {
    await db.insert(users).values(supervisorData);
    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
  }
  process.exit();
}
