import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";
import { getEmailData } from "../utils/email/engine.js";
import { emailQueue } from "../queues/email.queue.js";

const sendDirectEmail = async (
  type: string,
  to: string,
  payload: any,
  senderType?: string,
) => {
  const emailInfo = getEmailData(type, payload);
  if (!emailInfo) return;

  await emailQueue.add("send-email", {
    type,
    to,
    payload,
    senderType: senderType || "system",
  });

  console.log(`Queued email to ${to} for ${type}`);
};

// REVIEW CREATED
eventBus.on(Events.REVIEW_CREATED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "AMENDMENT_REQUIRED",
    data.studentEmail,
    {
      studentName: data.studentName,
      projectName: data.projectName,
      supervisorName: data.supervisorName,
      summary: data.summary,
      taskCount: data.taskCount,
    },
    sender,
  );
});

// TASK SUBMITTED
eventBus.on(Events.TASK_SUBMITTED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "TASK_SUBMITTED",
    data.supervisorEmail,
    {
      supervisorName: data.supervisorName,
      studentName: data.studentName,
      projectName: data.projectName,
      taskTitle: data.taskTitle,
      remainingCount: data.remainingCount,
      isRoundFinished: data.isRoundFinished,
    },
    sender,
  );
});

// TASK SUBMITTED CONFIRMATION
eventBus.on(Events.TASK_SUBMITTED_CONFIRMATION, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "TASK_SUBMITTED_CONFIRMATION",
    data.studentEmail,
    {
      studentName: data.studentName,
      projectName: data.projectName,
      taskTitle: data.taskTitle,
    },
    sender,
  );
});

// TASK VERIFIED
eventBus.on(Events.TASK_VERIFIED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "TASK_VERIFIED",
    data.studentEmail,
    {
      studentName: data.studentName,
      taskTitle: data.taskTitle,
      projectName: data.projectName,
    },
    sender,
  );
});

// TASK ASSIGNED
eventBus.on(Events.TASK_ASSIGNED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "TASK_ASSIGNED",
    data.studentEmail,
    {
      studentName: data.studentName,
      taskTitle: data.taskTitle,
      projectName: data.projectName,
    },
    sender,
  );
});

// USER REGISTERED
eventBus.on(Events.USER_REGISTERED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "USER_REGISTERED",
    data.email,
    {
      fullName: data.fullName,
      password: data.password,
      role: data.role,
      email: data.email,
    },
    sender,
  );
});
