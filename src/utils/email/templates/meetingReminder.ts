import { mainLayout } from "../layouts/mainLayout.js";

export const meetingReminderTemplate = (data: {
  recipientName: string;
  recipientRole: "student" | "supervisor";
  studentName: string;
  supervisorName: string;
  meetingTitle: string;
  meetingUrl: string;
  scheduledAt: string;
}) => {
  const meetingTime = new Date(data.scheduledAt).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const otherParticipant =
    data.recipientRole === "student" ? data.supervisorName : data.studentName;

  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background-color: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
        Meeting Reminder
      </span>
    </div>


    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      Your Meeting Starts in 1 Hour
    </h2>


    <p style="color: #475569; font-size: 14px; text-align: center; margin: 0 0 24px 0; line-height: 1.6;">
      Hi <strong>${data.recipientName}</strong>,<br>
      This is a reminder that your meeting with 
      <strong>${otherParticipant}</strong> 
      starts at <strong>${meetingTime}</strong>.
    </p>


    <div style="background-color: #fffbeb; border-left: 4px solid #d97706; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 12px; color: #92400e; font-weight: 600;">
        ${data.meetingTitle}
      </p>
    </div>


    <div style="text-align: center; margin-top: 28px;">
      <a 
        href="${data.meetingUrl}" 
        target="_blank" 
        rel="noopener noreferrer"
        style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;"
      >
        Join Meeting
      </a>
    </div>
  `;

  return mainLayout(html);
};
