import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";
import { getEmailData } from "../utils/email/engine.js";
import { sendEmail } from "../services/mail.js";

const sendDirectEmail = async (type: string, to: string, payload: any) => {
  const emailInfo = getEmailData(type, payload);
  if (!emailInfo) return;
  try {
    await sendEmail(to, emailInfo.subject, emailInfo.html);
    console.log(`Email sent to ${to} for ${type}`);
  } catch (err) {
    console.error(`Failed to send email to ${to} for ${type}:`, err);
  }
};

// REVIEW CREATED
eventBus.on(Events.REVIEW_CREATED, async (data: any) => {
  console.log("Listener received", data);
  await sendDirectEmail("AMENDMENT_REQUIRED", data.studentEmail, {
    studentName: data.studentName,
    projectName: data.projectName,
    supervisorName: data.supervisorName,
    summary: data.summary,
    taskCount: data.taskCount,
  });
});

// TASK SUBMITTED
eventBus.on(Events.TASK_SUBMITTED, async (data: any) => {
  console.log("Listener received", data);
  await sendDirectEmail("TASK_SUBMITTED", data.supervisorEmail, {
    supervisorName: data.supervisorName,
    studentName: data.studentName,
    projectName: data.projectName,
    taskTitle: data.taskTitle,
  });
});

// TASK SUBMITTED CONFIRMATION
eventBus.on(Events.TASK_SUBMITTED_CONFIRMATION, async (data: any) => {
  console.log("Listener received", data);
  await sendDirectEmail("TASK_SUBMITTED_CONFIRMATION", data.studentEmail, {
    studentName: data.studentName,
    projectName: data.projectName,
    taskTitle: data.taskTitle,
  });
});

// TASK VERIFIED
eventBus.on(Events.TASK_VERIFIED, async (data: any) => {
  console.log("Listener received", data);
  await sendDirectEmail("TASK_VERIFIED", data.studentEmail, {
    studentName: data.studentName,
    taskTitle: data.taskTitle,
    projectName: data.projectName,
  });
});

// TASK ASSIGNED
eventBus.on(Events.TASK_ASSIGNED, async (data: any) => {
  console.log("Listener received", data);
  await sendDirectEmail("TASK_ASSIGNED", data.studentEmail, {
    studentName: data.studentName,
    taskTitle: data.taskTitle,
    projectName: data.projectName,
  });
});

// USER REGISTERED
eventBus.on(Events.USER_REGISTERED, async (data: any) => {
  console.log("Listener received", data);
  await sendDirectEmail("USER_REGISTERED", data.email, {
    fullName: data.fullName,
    password: data.password,
    role: data.role,
    email: data.email,
  });
});
