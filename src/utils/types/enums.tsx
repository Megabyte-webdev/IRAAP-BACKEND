import { pgEnum } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["STUDENT", "SUPERVISOR", "ADMIN"]);

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
export const meetingStatusEnum = pgEnum("meeting_status", [
  "SCHEDULED",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
]);
