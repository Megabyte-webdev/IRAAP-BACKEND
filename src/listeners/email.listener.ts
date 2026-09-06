import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";
import { getEmailData } from "../utils/email/engine.js";
import { emailQueue, meetingReminderQueue } from "../queues/email.queue.js";
import { getReminderTimes } from "../utils/helper.js";
import { sendEmail } from "../services/mail.js";
import { createNotification } from "../services/notifications.js";
import { db } from "../config/db.js";
import { eq } from "drizzle-orm";
import { users } from "../database/schema.js";

const sendDirectEmail = async (
  type: string,
  to: string,
  payload: any,
  senderType?: string,
) => {
  const emailInfo = getEmailData(type, payload);
  if (!emailInfo) return;

  const sender = senderType || "system";
  // Deliver immediately so production does not depend on a separately running BullMQ worker.
  // On failure, queue the message for retry by the worker.
  const sent = await sendEmail(to, emailInfo.subject, emailInfo.html, sender as any);
  if (!sent.success) {
    await emailQueue.add(
      "send-email",
      { type, to, payload, senderType: sender },
      { removeOnComplete: true, removeOnFail: 100 },
    );
    console.warn(`Email send failed; queued retry for ${to} (${type})`);
  } else {
    console.log(`Email sent to ${to} for ${type}`);
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, to.toLowerCase()) });
  if (user) {
    await createNotification({
      userId: user.id,
      organizationId: user.organizationId ?? null,
      type,
      title: emailInfo.subject,
      message: payload?.notificationMessage || emailInfo.subject,
      link: payload?.dashboardUrl ? "/dashboard" : "/dashboard",
      metadata: { emailType: type },
    });
  }
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

eventBus.on(Events.SUPERVISOR_ASSIGNED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "SUPERVISOR_ASSIGNED",
    data.studentEmail,
    {
      studentName: data.studentName,
      supervisorName: data.supervisorName,
    },
    sender,
  );
});

eventBus.on(Events.SUPERVISOR_ROSTER_UPDATED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "SUPERVISOR_ROSTER_UPDATED",
    data.supervisorEmail,
    {
      supervisorName: data.supervisorName,
      students: data.students,
    },
    sender,
  );
});

// MEETING SCHEDULED
eventBus.on(Events.MEETING_SCHEDULED, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";

  await sendDirectEmail("MEETING_SCHEDULED", data.email, data, sender);

  const scheduledDate = new Date(data.scheduledAt);
  const reminderOffsets = getReminderTimes(scheduledDate);

  for (const minutes of reminderOffsets) {
    const reminderTime = scheduledDate.getTime() - minutes * 60 * 1000;
    const delay = reminderTime - Date.now();

    if (delay <= 0) continue;

    const role = (data.recipientType || "student").toLowerCase();

    // Queues specifically for the recipient in this event payload
    await meetingReminderQueue.add(
      "reminder",
      {
        messageId: data.messageId,
        email: data.email,
        recipientType: role,
        recipientName: data.recipientName,
        studentName: data.studentName,
        supervisorName: data.supervisorName,
        meetingTitle: data.meetingTitle,
        meetingUrl: data.meetingUrl,
        scheduledAt: data.scheduledAt,
        reminderMinutes: minutes,
      },
      {
        delay,
        jobId: `meeting-${data.messageId}-${role}-${minutes}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );
  }
});

eventBus.on(Events.PROJECT_PUBLICATION, async (data: any) => {
  console.log("Listener received", data);
  const sender = data.senderType || "system";
  await sendDirectEmail(
    "PROJECT_PUBLICATION",
    data.studentEmail,
    {
      studentName: data.studentName,
      projectName: data.projectName,
      supervisorName: data.supervisorName,
      dashboardUrl: data.dashboardUrl || "https://iraap.com.ng",
    },
    sender,
  );
});
