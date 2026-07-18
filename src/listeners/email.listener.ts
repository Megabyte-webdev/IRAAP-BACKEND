import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";
import { getEmailData } from "../utils/email/engine.js";
import { emailQueue, meetingReminderQueue } from "../queues/email.queue.js";
import { getReminderTimes } from "../utils/helper.js";

const sendDirectEmail = async (
  type: string,
  to: string,
  payload: any,
  senderType?: string,
) => {
  const emailInfo = getEmailData(type, payload);
  if (!emailInfo) return;

  await emailQueue.add(
    "send-email",
    {
      type,
      to,
      payload,
      senderType: senderType || "system",
    },
    {
      removeOnComplete: true,
      removeOnFail: 100,
    },
  );

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

  console.log("MEETING TIME:", scheduledDate);
  console.log("CURRENT TIME:", new Date());

  const reminderOffsets = getReminderTimes(scheduledDate);
  console.log("REMINDER OFFSETS:", reminderOffsets);

  for (const minutes of reminderOffsets) {
    const reminderTime = scheduledDate.getTime() - minutes * 60 * 1000;

    const delay = reminderTime - Date.now();
    console.log({
      minutes,
      reminderTime: new Date(reminderTime),
      delay,
    });

    if (delay <= 0) {
      continue;
    }

    // Student reminder
    await meetingReminderQueue.add(
      "reminder",
      {
        messageId: data.messageId,
        email: data.email,
        recipientType: "STUDENT",
        recipientName: data.recipientName,
        supervisorName: data.supervisorName,
        meetingTitle: data.meetingTitle,
        meetingUrl: data.meetingUrl,
        scheduledAt: data.scheduledAt,
        reminderMinutes: minutes,
      },
      {
        delay,
        jobId: `meeting-${data.messageId}-student-${minutes}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    // Supervisor reminder
    await meetingReminderQueue.add(
      "reminder",
      {
        messageId: data.messageId,
        email: data.supervisorEmail || data.email,
        recipientName: data.supervisorName,
        recipientType: "SUPERVISOR",
        supervisorName: data.supervisorName,
        meetingTitle: data.meetingTitle,
        meetingUrl: data.meetingUrl,
        scheduledAt: data.scheduledAt,
        reminderMinutes: minutes,
      },
      {
        delay,
        jobId: `meeting-${data.messageId}-supervisor-${minutes}`,
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
