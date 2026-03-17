import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  pgEnum,
  integer,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["STUDENT", "SUPERVISOR", "ADMIN"]);
export const statusEnum = pgEnum("status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVISION_REQUESTED",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),

    fullName: varchar("full_name", { length: 255 }).notNull(),

    email: varchar("email", { length: 255 }).unique().notNull(),

    password: text("password").notNull(),

    role: roleEnum("role").default("STUDENT").notNull(),

    createdAt: timestamp("created_at").defaultNow(),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailIndex: index("users_email_idx").on(table.email),
  }),
);

export const projects = pgTable(
  "projects",
  {
    id: serial("id").primaryKey(),

    title: text("title").notNull(),

    abstract: text("abstract").notNull(),

    fileUrl: text("file_url").notNull(),

    publicId: text("public_id").notNull(),

    studentId: integer("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    supervisorId: integer("supervisor_id").references(() => users.id),

    categoryId: integer("category_id").references(() => categories.id),

    status: statusEnum("status").default("PENDING").notNull(),

    submissionYear: integer("submission_year").notNull(),

    createdAt: timestamp("created_at").defaultNow(),

    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    titleIndex: index("projects_title_idx").on(table.title),
    statusIndex: index("projects_status_idx").on(table.status),
    uniqueStudentTitle: unique("unique_student_title").on(
      table.studentId,
      table.title,
    ),
  }),
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 255 }).unique().notNull(),

  description: text("description"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),

  projectId: integer("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),

  reviewerId: integer("reviewer_id")
    .references(() => users.id)
    .notNull(),

  comments: text("comments").notNull(),

  rating: integer("rating"),

  createdAt: timestamp("created_at").defaultNow(),
});

export const downloads = pgTable(
  "downloads",
  {
    id: serial("id").primaryKey(),

    projectId: integer("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),

    userId: integer("user_id").references(() => users.id),

    downloadedAt: timestamp("downloaded_at").defaultNow(),
  },
  (table) => ({
    projectIndex: index("downloads_project_idx").on(table.projectId),
  }),
);

export const metadata = pgTable("metadata", {
  id: serial("id").primaryKey(),

  projectId: integer("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),

  keywords: text("keywords").notNull(),

  researchArea: varchar("research_area", { length: 255 }).notNull(),

  methodology: varchar("methodology", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
});
