import { amendmentTemplate } from "./templates/ammendment.js";
import { assignedTemplate } from "./templates/assigned.js";
import { submittedTemplate } from "./templates/submitted.js";
import { verifiedTemplate } from "./templates/verified.js";

export const getEmailData = (type: string, payload: any) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

  switch (type) {
    case "TASK_ASSIGNED":
      return {
        subject: `[IRAP] New Task Assigned: ${payload.taskTitle}`,
        html: assignedTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "TASK_SUBMITTED":
      return {
        subject: `[Review Required] ${payload.studentName} submitted work`,
        html: submittedTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "TASK_VERIFIED":
      return {
        subject: `[Approved] Milestone Verified: ${payload.taskTitle}`,
        html: verifiedTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    // Use this for "createReviewWithTasks" instead of "REJECTED"
    case "AMENDMENT_REQUIRED":
      return {
        subject: `[IRAP] Feedback & Amendments: ${payload.projectName}`,
        html: amendmentTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    default:
      console.warn(`Email type ${type} not recognized.`);
      return null;
  }
};
