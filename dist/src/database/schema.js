import { relations } from "drizzle-orm";
import { pgTable, serial, text, varchar, timestamp, pgEnum, integer, index, unique, } from "drizzle-orm/pg-core";
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
export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password: text("password").notNull(),
    role: roleEnum("role").default("STUDENT").notNull(),
    supervisorId: integer("supervisor_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    emailIndex: index("users_email_idx").on(table.email),
    supervisorIndex: index("users_supervisor_idx").on(table.supervisorId),
}));
export const categories = pgTable("categories", {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).unique().notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
});
export const projects = pgTable("projects", {
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
}, (table) => ({
    titleIndex: index("projects_title_idx").on(table.title),
    statusIndex: index("projects_status_idx").on(table.status),
    uniqueStudentTitle: unique("unique_student_title").on(table.studentId, table.title),
}));
export const reviews = pgTable("reviews", {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
        .references(() => projects.id, { onDelete: "cascade" })
        .notNull(),
    reviewerId: integer("reviewer_id")
        .references(() => users.id)
        .notNull(),
    summary: text("summary"),
    createdAt: timestamp("created_at").defaultNow(),
});
export const reviewTasks = pgTable("review_tasks", {
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
    completedAt: timestamp("completed_at"),
    verifiedBy: integer("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
    reviewIndex: index("review_tasks_review_idx").on(table.reviewId),
    projectIndex: index("review_tasks_project_idx").on(table.projectId),
    uniqueTaskPerReview: unique("unique_task_per_review").on(table.reviewId, table.title),
}));
export const downloads = pgTable("downloads", {
    id: serial("id").primaryKey(),
    projectId: integer("project_id")
        .references(() => projects.id, { onDelete: "cascade" })
        .notNull(),
    userId: integer("user_id").references(() => users.id),
    downloadedAt: timestamp("downloaded_at").defaultNow(),
}, (table) => ({
    projectIndex: index("downloads_project_idx").on(table.projectId),
}));
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
}));
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
//# sourceMappingURL=schema.js.map