import { relations } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  index,
  unique,
  boolean,
} from "drizzle-orm/pg-core";
import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["STUDENT", "SUPERVISOR", "ADMIN"]);

export const organizationMemberRoleEnum = pgEnum("organization_member_role", [
  "STUDENT",
  "SUPERVISOR",
  "RESEARCHER",
  "MANAGER",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "TRIAL",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
]);

export const statusEnum = pgEnum("status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "VERIFIED",
  "REVISION_REQUESTED",
]);

export const researchTypeEnum = pgEnum("research_type", [
  "BSC_PROJECT",
  "MSC_THESIS",
  "PHD_DISSERTATION",
  "JOURNAL",
  "INDEPENDENT_RESEARCH",
]);

export const publicationStatusEnum = pgEnum("publication_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
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
export const authOtpPurposeEnum = pgEnum("auth_otp_purpose", [
  "SIGNUP",
  "LOGIN",
  "PASSWORD_RESET",
]);

export const meetingStatusEnum = pgEnum("meeting_status", [
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 180 }).unique().notNull(),
    code: varchar("code", { length: 80 }).unique(),
    description: text("description"),
    createdBy: integer("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    slugIndex: index("organizations_slug_idx").on(table.slug),
  }),
);

export const organizationMemberships = pgTable(
  "organization_memberships",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: integer("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    role: organizationMemberRoleEnum("role").notNull(),
    department: varchar("department", { length: 255 }),
    externalRef: varchar("external_ref", { length: 120 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    organizationUserUnique: unique("organization_membership_org_user").on(
      table.organizationId,
      table.userId,
    ),
    organizationIndex: index("organization_membership_org_idx").on(
      table.organizationId,
    ),
    userIndex: index("organization_membership_user_idx").on(table.userId),
  }),
);

export const organizationSubscriptions = pgTable(
  "organization_subscriptions",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    planCode: varchar("plan_code", { length: 80 }).notNull().default("FREE"),
    status: subscriptionStatusEnum("status").notNull().default("TRIAL"),
    startsAt: timestamp("starts_at").notNull().defaultNow(),
    endsAt: timestamp("ends_at"),
    externalCustomerId: varchar("external_customer_id", { length: 255 }),
    externalSubscriptionId: varchar("external_subscription_id", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    organizationIndex: index("organization_subscriptions_org_idx").on(
      table.organizationId,
    ),
  }),
);

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: serial("id").primaryKey(),
    requesterId: integer("requester_id").references(() => users.id, {
      onDelete: "set null",
    }),
    organizationId: integer("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    role: varchar("role", { length: 100 }),
    subject: varchar("subject", { length: 255 }).notNull().default("General Support"),
    message: text("message").notNull(),
    status: varchar("status", { length: 40 }).notNull().default("OPEN"),
    adminNote: text("admin_note"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIndex: index("support_ticket_status_idx").on(table.status),
    emailIndex: index("support_ticket_email_idx").on(table.email),
  }),
);

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).unique().notNull(),
    password: text("password").notNull(),
    emailVerifiedAt: timestamp("email_verified_at"),
    profileImageUrl: text("profile_image_url"),
    profileImagePublicId: text("profile_image_public_id"),
    phone: varchar("phone", { length: 30 }),
    matricNumber: varchar("matric_number", { length: 80 }),
    department: varchar("department", { length: 255 }),
    programme: varchar("programme", { length: 255 }),
    level: varchar("level", { length: 50 }),
    academicSession: varchar("academic_session", { length: 50 }),
    bio: text("bio"),
    profileCompletedAt: timestamp("profile_completed_at"),
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
    organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    abstract: text("abstract").notNull(),

    fileUrl: text("file_url").notNull(),
    publicId: text("public_id").notNull(),

    studentId: integer("student_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),

    supervisorId: integer("supervisor_id").references(() => users.id),
    categoryId: integer("category_id").references(() => categories.id),
    researchType: researchTypeEnum("research_type")
      .default("INDEPENDENT_RESEARCH")
      .notNull(),

    isSignaledForPublication: boolean("is_signaled_for_publication")
      .default(false)
      .notNull(),
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

export const publicationRequests = pgTable(
  "publication_requests",
  {
    id: serial("id").primaryKey(),
    organizationId: integer("organization_id").references(() => organizations.id, { onDelete: "set null" }),

    projectId: integer("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),

    requesterId: integer("requester_id")
      .references(() => users.id)
      .notNull(),

    title: text("title").notNull(),

    abstract: text("abstract").notNull(),

    fileUrl: text("file_url").notNull(),

    publicId: text("public_id").notNull(),
    researchType: researchTypeEnum("research_type")
      .default("JOURNAL")
      .notNull(),

    keywords: text("keywords").array().notNull(),

    researchArea: varchar("research_area", {
      length: 255,
    }).notNull(),

    methodology: text("methodology"),

    status: publicationStatusEnum("status").default("PENDING").notNull(),

    adminNote: text("admin_note"),

    publishedAt: timestamp("published_at"),
    approvedBy: integer("approved_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    statusIndex: index("publication_status_idx").on(table.status),

    requesterIndex: index("publication_requester_idx").on(table.requesterId),
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
    msgType: messageTypeEnum("msgType").notNull().default("TEXT"),
    meetingRecordId: integer("meeting_record_id").references(() => meetings.id),
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

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  meetingId: varchar("meeting_id", { length: 100 }).notNull().unique(),
  conversationId: integer("conversation_id")
    .references(() => conversations.id, {
      onDelete: "cascade",
    })
    .notNull(),
  createdBy: integer("created_by")
    .references(() => users.id)
    .notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  meetingUrl: text("meeting_url").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  duration: integer("duration").notNull(),
  status: meetingStatusEnum("status").default("SCHEDULED").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const authOtpChallenges = pgTable(
  "auth_otp_challenges",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: varchar("email", { length: 255 }).notNull(),
    purpose: authOtpPurposeEnum("purpose").notNull(),
    codeHash: varchar("code_hash", { length: 64 }).notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    attempts: integer("attempts").default(0).notNull(),
    consumedAt: timestamp("consumed_at"),
    lastSentAt: timestamp("last_sent_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailPurposeIndex: index("auth_otp_email_purpose_idx").on(table.email, table.purpose),
    userPurposeIndex: index("auth_otp_user_purpose_idx").on(table.userId, table.purpose),
    expiresIndex: index("auth_otp_expires_idx").on(table.expiresAt),
  }),
);

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),

  userId: integer("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),

  token: text("token").notNull().unique(),

  expiresAt: timestamp("expires_at").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, {
    fields: [organizations.createdBy],
    references: [users.id],
    relationName: "organizationCreator",
  }),
  memberships: many(organizationMemberships),
  subscriptions: many(organizationSubscriptions),
  projects: many(projects),
  publications: many(publicationRequests),
  primaryUsers: many(users, { relationName: "primaryOrganization" }),
  supportTickets: many(supportTickets),
}));

export const organizationMembershipsRelations = relations(
  organizationMemberships,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMemberships.organizationId],
      references: [organizations.id],
    }),
    user: one(users, {
      fields: [organizationMemberships.userId],
      references: [users.id],
    }),
  }),
);

export const organizationSubscriptionsRelations = relations(
  organizationSubscriptions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationSubscriptions.organizationId],
      references: [organizations.id],
    }),
  }),
);

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  requester: one(users, {
    fields: [supportTickets.requesterId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [supportTickets.organizationId],
    references: [organizations.id],
  }),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  projects: many(projects),

  publicationRequests: many(publicationRequests, {
    relationName: "publicationRequester",
  }),

  approvedPublications: many(publicationRequests, {
    relationName: "publicationApprover",
  }),

  reviews: many(reviews),
  memberships: many(organizationMemberships),
  createdOrganizations: many(organizations, { relationName: "organizationCreator" }),
  subscriptionsAsOwner: many(organizationSubscriptions),
  supportTickets: many(supportTickets),
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
    relationName: "primaryOrganization",
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  student: one(users, {
    fields: [projects.studentId],
    references: [users.id],
  }),

  supervisor: one(users, {
    fields: [projects.supervisorId],
    references: [users.id],
  }),

  publicationRequest: one(publicationRequests, {
    fields: [projects.id],
    references: [publicationRequests.projectId],
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
    meetings: many(meetings),
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
  meeting: one(meetings, {
    fields: [messages.meetingRecordId],
    references: [meetings.id],
  }),
}));
export const meetingsRelations = relations(meetings, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [meetings.conversationId],
    references: [conversations.id],
  }),
  creator: one(users, {
    fields: [meetings.createdBy],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const publicationRequestsRelations = relations(
  publicationRequests,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [publicationRequests.organizationId],
      references: [organizations.id],
    }),
    requester: one(users, {
      fields: [publicationRequests.requesterId],
      references: [users.id],
      relationName: "publicationRequester",
    }),

    approvedByUser: one(users, {
      fields: [publicationRequests.approvedBy],
      references: [users.id],
      relationName: "publicationApprover",
    }),

    project: one(projects, {
      fields: [publicationRequests.projectId],
      references: [projects.id],
    }),
  }),
);
