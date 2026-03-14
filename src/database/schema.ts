import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["STUDENT", "SUPERVISOR", "ADMIN"]);
export const statusEnum = pgEnum("status", ["PENDING", "APPROVED", "REJECTED"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  password: text("password").notNull(),
  role: roleEnum("role").default("STUDENT").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  abstract: text("abstract").notNull(),
  fileUrl: text("file_url").notNull(), // URL to PDF [cite: 20]
  publicId: text("public_id").notNull(), // Cloudinary public_id for deletion
  studentId: integer("student_id").references(() => users.id),
  supervisorId: integer("supervisor_id").references(() => users.id),
  status: statusEnum("status").default("PENDING").notNull(),
  submissionYear: varchar("submission_year", { length: 4 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
