import { amendmentTemplate } from "./templates/amendment.js";
import { assignedTemplate } from "./templates/assigned.js";
import { taskSubmittedTemplate } from "./templates/taskSubmitted.js";
import { revisionSubmittedTemplate } from "./templates/revisionSubmitted.js";
import { taskSubmissionTemplate } from "./templates/taskSubmission.js";
import { registeredTemplate } from "./templates/userRegister.js";
import { verifiedTemplate } from "./templates/verified.js";
import { supervisorAssignedTemplate } from "./templates/supervisorAssigned.js";
import { supervisorAllocationTemplate } from "./templates/supervisorAllocation.js";

export const getEmailData = (type: string, payload: any) => {
  const frontendUrl = "https://iraap.com.ng";

  switch (type) {
    case "TASK_ASSIGNED":
      return {
        subject: `[IRAAP] New Task Assigned: ${payload.taskTitle}`,
        html: assignedTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "TASK_SUBMITTED":
      return {
        subject: payload.isRoundFinished
          ? `[Action Required] Corrections Completed - ${payload.studentName}`
          : `[IRAAP Progress Update] ${payload.studentName} updated task checklist items`,
        html: taskSubmittedTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "REVISION_SUBMITTED":
      return {
        subject: `[Review Required] Version ${payload.versionNumber} Compiled Assets Dropped`,
        html: revisionSubmittedTemplate({
          ...payload,
          dashboardUrl: frontendUrl,
        }),
      };

    case "TASK_SUBMITTED_CONFIRMATION":
      return {
        subject: `[IRAAP] Submission Received: ${payload.taskTitle}`,
        html: taskSubmissionTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "TASK_VERIFIED":
      return {
        subject: `[Approved] Milestone Verified: ${payload.taskTitle}`,
        html: verifiedTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "AMENDMENT_REQUIRED":
      return {
        subject: `[IRAAP] Feedback & Amendments: ${payload.projectName}`,
        html: amendmentTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "USER_REGISTERED":
      return {
        subject: `[IRAAP] Welcome ${payload.fullName}`,
        html: registeredTemplate({ ...payload, dashboardUrl: frontendUrl }),
      };

    case "SUPERVISOR_ASSIGNED":
      return {
        subject: `[IRAAP] Supervisor Assigned`,
        html: supervisorAssignedTemplate({
          ...payload,
          dashboardUrl: frontendUrl,
        }),
      };

    case "SUPERVISOR_ROSTER_UPDATED":
      return {
        subject: `[IRAAP] Student Allocation Update`,
        html: supervisorAllocationTemplate({
          ...payload,
          dashboardUrl: frontendUrl,
        }),
      };

    default:
      console.warn(`Email type ${type} not recognized.`);
      return null;
  }
};
