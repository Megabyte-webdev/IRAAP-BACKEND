import { amendmentTemplate } from "./templates/ammendment.js";
import { assignedTemplate } from "./templates/assigned.js";
import { submittedTemplate } from "./templates/submitted.js";
import { taskSubmissionTemplate } from "./templates/taskSubmission.js";
import { registeredTemplate } from "./templates/userRegister.js";
import { verifiedTemplate } from "./templates/verified.js";

export const getEmailData = (type: string, payload: any) => {
  const frontendUrl = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL
    : "https://iraap-app.vercel.app/";

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

    case "TASK_SUBMITTED_CONFIRMATION":
      return {
        subject: `[IRAP] Submission Received: ${payload.taskTitle}`,
        html: taskSubmissionTemplate({
          ...payload,
          dashboardUrl: frontendUrl,
        }),
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
    case "USER_REGISTERED":
      return {
        subject: `[IRAP] Welcome ${payload.fullName}`,
        html: registeredTemplate({
          ...payload,
          dashboardUrl: frontendUrl,
        }),
      };

    default:
      console.warn(`Email type ${type} not recognized.`);
      return null;
  }
};
