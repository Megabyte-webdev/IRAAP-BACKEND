import { eventBus } from "../events/index.js";
import { emailQueue } from "../queues/email.queue.js";
import { Events } from "../utils/email/email.types.js";

const queueConfig = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000, // 5s, 10s, 20s...
  },
};

eventBus.on(Events.REVIEW_CREATED, async (data: any) => {
  console.log('Listener received', data)
  await emailQueue.add(
    "send-email",
    {
      type: "AMENDMENT_REQUIRED",
      to: data.studentEmail,
      payload: {
        studentName: data.studentName,
        projectName: data.projectName,
        supervisorName: data.supervisorName,
        summary: data.summary,
        taskCount: data.taskCount,
      },
    },
    queueConfig,
  );
});

eventBus.on(Events.TASK_SUBMITTED, async (data: any) => {
  console.log('Listener received', data)
  await emailQueue.add(
    "send-email",
    {
      type: "TASK_SUBMITTED",
      to: data.supervisorEmail,
      payload: {
        supervisorName: data.supervisorName,
        studentName: data.studentName,
        projectName: data.projectName,
        taskTitle: data.taskTitle,
      },
    },
    queueConfig,
  );
});
eventBus.on(Events.TASK_SUBMITTED_CONFIRMATION, async (data: any) => {
  console.log('Listener received', data)
  await emailQueue.add(
    "send-email",
    {
      type: "TASK_SUBMITTED_CONFIRMATION",
      to: data.studentEmail,
      payload: {
        studentName: data.studentName,
        projectName: data.projectName,
        taskTitle: data.taskTitle,
      },
    },
    queueConfig,
  );
});

eventBus.on(Events.TASK_VERIFIED, async (data: any) => {
  console.log('Listener received', data)
  await emailQueue.add(
    "send-email",
    {
      type: "TASK_VERIFIED",
      to: data.studentEmail,
      payload: {
        studentName: data.studentName,
        taskTitle: data.taskTitle,
        projectName: data.projectName,
      },
    },
    queueConfig,
  );
});

eventBus.on(Events.TASK_ASSIGNED, async (data: any) => {
  console.log('Listener received', data)
  await emailQueue.add(
    "send-email",
    {
      type: "TASK_ASSIGNED",
      to: data.studentEmail,
      payload: {
        studentName: data.studentName,
        taskTitle: data.taskTitle,
        projectName: data.projectName,
      },
    },
    queueConfig,
  );
});

eventBus.on(Events.USER_REGISTERED, async (data: any) => {
 console.log('Listener received', data)
  await emailQueue.add(
    "send-email",
    {
      type: "USER_REGISTERED", // Ensure your email processor/template handles this type
      to: data.email,
      payload: {
        fullName: data.fullName,
        password: data.password, // The temporary raw password
        role: data.role,
        email: data.email,
      },
    },
    queueConfig,
  );
});
