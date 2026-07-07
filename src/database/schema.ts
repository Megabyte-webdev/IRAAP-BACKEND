import { relations } from "drizzle-orm";
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
  boolean,
} from "drizzle-orm/pg-core";

// ENUMS

export const roleEnum = pgEnum("role", ["STUDENT", "SUPERVISOR", "ADMIN"]);

export const statusEnum = pgEnum("status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "REVISION_REQUESTED",
]);

export const reviewTaskStatusEnum = pgEnum("review_task_status", [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "VERIFIED",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "SENT",
  "DELIVERED",
  "READ",
]);
export const messageTypeEnum = pgEnum("message_type", [
  "TEXT",
  "CALL_INVITE",
  "FILE",
]);

export const versionTriggerEnum = pgEnum("version_trigger", [
  "INITIAL_SUBMISSION",
  "STUDENT_UPDATE",
  "REVISION_SUBMISSION",
]);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password: text("password").notNull(),
    role: roleEnum("role").default("STUDENT").notNull(),
    supervisorId: integer("supervisor_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    emailIndex: index("users_email_idx").on(table.email),
    supervisorIndex: index("users_supervisor_idx").on(table.supervisorId),
  }),
);

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).unique().notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const projectVersions = pgTable(
  "project_versions",
  {
    id: serial("id").primaryKey(),

    projectId: integer("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),

    fileUrl: text("file_url").notNull(),
    publicId: text("public_id").notNull(),

    versionNumber: integer("version_number").notNull(),

    uploadedBy: integer("uploaded_by")
      .references(() => users.id)
      .notNull(),

    changeNote: text("change_note"),

    linkedReviewId: integer("linked_review_id"),

    trigger: versionTriggerEnum("trigger")
      .default("INITIAL_SUBMISSION")
      .notNull(),

    fileSizeBytes: integer("file_size_bytes"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    projectIndex: index("project_versions_project_idx").on(table.projectId),
    versionIndex: index("project_versions_number_idx").on(
      table.projectId,
      table.versionNumber,
    ),
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

    currentVersionId: integer("current_version_id").references(
      () => projectVersions.id,
    ),

    totalVersions: integer("total_versions").default(1).notNull(),

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

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),

  projectId: integer("project_id")
    .references(() => projects.id, { onDelete: "cascade" })
    .notNull(),

  reviewerId: integer("reviewer_id")
    .references(() => users.id)
    .notNull(),

  summary: text("summary"),

  revisionVersionId: integer("revision_version_id").references(
    () => projectVersions.id,
  ),

  revisionSubmitted: boolean("revision_submitted").default(false).notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const reviewTasks = pgTable(
  "review_tasks",
  {
    id: serial("id").primaryKey(),

    reviewId: integer("review_id")
      .references(() => reviews.id, { onDelete: "cascade" })
      .notNull(),

    projectId: integer("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    status: reviewTaskStatusEnum("status").default("PENDING").notNull(),

    studentNote: text("student_note"),

    evidenceFileUrl: text("evidence_file_url"),
    evidencePublicId: text("evidence_public_id"),

    completedAt: timestamp("completed_at"),

    verifiedBy: integer("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    reviewIndex: index("review_tasks_review_idx").on(table.reviewId),
    projectIndex: index("review_tasks_project_idx").on(table.projectId),
    uniqueTaskPerReview: unique("unique_task_per_review").on(
      table.reviewId,
      table.title,
    ),
    updatedAtIndex: index("review_tasks_updated_at_idx").on(table.updatedAt),
  }),
);

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
  keywords: text("keywords").array().notNull(),
  researchArea: varchar("research_area", { length: 255 }).notNull(),
  methodology: text("methodology"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable(
  "conversations",
  {
    id: serial("id").primaryKey(),
    supervisorId: integer("supervisor_id")
      .references(() => users.id)
      .notNull(),
    studentId: integer("student_id")
      .references(() => users.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    lastMessageId: integer("last_message_id"),
  },
  (table) => ({
    uniquePair: unique("unique_supervisor_student").on(
      table.supervisorId,
      table.studentId,
    ),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    conversationId: integer("conversation_id")
      .references(() => conversations.id, { onDelete: "cascade" })
      .notNull(),
    senderId: integer("sender_id")
      .references(() => users.id)
      .notNull(),
    content: text("content").notNull(),
    replyToMessageId: integer("reply_to_message_id").references(
      () => messages.id,
    ),
    type: messageTypeEnum("type").notNull().default("TEXT"),
    meetingId: varchar("meetingId", {
      length: 255,
    }),

    meetingUrl: text("meetingUrl"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
    status: messageStatusEnum("status").default("SENT").notNull(),
  },
  (table) => ({
    convoIndex: index("messages_convo_idx").on(table.conversationId),
    createdAtIndex: index("messages_convo_created_idx").on(
      table.conversationId,
      table.createdAt,
    ),
  }),
);

export const projectsRelations = relations(projects, ({ one, many }) => ({
  student: one(users, {
    fields: [projects.studentId],
    references: [users.id],
  }),
  supervisor: one(users, {
    fields: [projects.supervisorId],
    references: [users.id],
  }),
  reviews: many(reviews),
  versions: many(projectVersions),
  currentVersion: one(projectVersions, {
    fields: [projects.currentVersionId],
    references: [projectVersions.id],
  }),
}));

export const projectVersionsRelations = relations(
  projectVersions,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectVersions.projectId],
      references: [projects.id],
    }),
    uploader: one(users, {
      fields: [projectVersions.uploadedBy],
      references: [users.id],
    }),
    linkedReview: one(reviews, {
      fields: [projectVersions.linkedReviewId],
      references: [reviews.id],
    }),
  }),
);

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  project: one(projects, {
    fields: [reviews.projectId],
    references: [projects.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
  tasks: many(reviewTasks),
  revisionVersion: one(projectVersions, {
    fields: [reviews.revisionVersionId],
    references: [projectVersions.id],
  }),
}));

export const reviewTasksRelations = relations(reviewTasks, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewTasks.reviewId],
    references: [reviews.id],
  }),
  project: one(projects, {
    fields: [reviewTasks.projectId],
    references: [projects.id],
  }),
  verifiedByUser: one(users, {
    fields: [reviewTasks.verifiedBy],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(
  conversations,
  ({ one, many }) => ({
    supervisor: one(users, {
      fields: [conversations.supervisorId],
      references: [users.id],
    }),
    student: one(users, {
      fields: [conversations.studentId],
      references: [users.id],
    }),
    messages: many(messages),
    lastMessage: one(messages, {
      fields: [conversations.lastMessageId],
      references: [messages.id],
    }),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  replyTo: one(messages, {
    fields: [messages.replyToMessageId],
    references: [messages.id],
  }),
}));
