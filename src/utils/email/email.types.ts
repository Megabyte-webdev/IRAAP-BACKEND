export enum EmailType {
  TASK_ASSIGNED = "TASK_ASSIGNED",
  TASK_SUBMITTED = "TASK_SUBMITTED",
  TASK_VERIFIED = "TASK_VERIFIED",
  AMENDMENT_REQUIRED = "AMENDMENT_REQUIRED",
}

export type AmendmentPayload = {
  studentName: string;
  projectName: string;
  supervisorName: string;
  summary: string;
  taskCount: number;
};

export enum Events {
  // Review workflow
  REVIEW_CREATED = "review.created",

  // Task workflow
  TASK_SUBMITTED = "task.submitted",
  TASK_VERIFIED = "task.verified",
  TASK_ASSIGNED = "task.pending",
  TASK_SUBMITTED_CONFIRMATION = "task.submitted.confirmation",

  // All tasks completed (critical: only when ALL tasks done)
  ALL_TASKS_COMPLETED = "all.tasks.completed",

  // Revision workflow
  REVISION_SUBMITTED = "revision.submitted",
  TASKS_VERIFIED = "tasks.verified",

  // Project workflow
  PROJECT_APPROVED = "project.approved",
  PROJECT_REJECTED = "project.rejected",

  // User
  USER_REGISTERED = "user.registered",
}
