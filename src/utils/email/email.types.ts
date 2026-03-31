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
  REVIEW_CREATED = "review.created",
  TASK_SUBMITTED = "task.submitted",
  TASK_VERIFIED = "task.verified",
  TASK_ASSIGNED = "task.pending",
  USER_REGISTERED = "user.registered",
  TASK_SUBMITTED_CONFIRMATION = "task.submitted.confirmation",
}
