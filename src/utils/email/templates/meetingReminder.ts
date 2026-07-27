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
    <!-- Category Label -->
    <p style="
      margin: 0 0 12px 0;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #3aa6ee;
    ">
      Upcoming Schedule
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      Meeting Reminder: Starting in 1 Hour
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.recipientName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      This is a quick reminder that your scheduled session with <strong>${otherParticipant}</strong> is starting shortly at <strong>${meetingTime}</strong>.
    </p>

    <!-- Callout Box (Table-based for email client compatibility) -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; border-collapse: collapse;">
      <tr>
        <td style="
          background-color: #f8fafc;
          border-left: 4px solid #3aa6ee;
          padding: 16px 20px;
        ">
          <p style="
            margin: 0 0 4px 0;
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          ">
            Meeting Agenda / Topic
          </p>
          <p style="
            margin: 0;
            font-size: 15px;
            font-weight: 600;
            color: #0f172a;
            line-height: 1.5;
          ">
            ${data.meetingTitle}
          </p>
        </td>
      </tr>
    </table>

    <!-- Primary Action Button (Table-based CTA) -->
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
      <tr>
        <td align="center" style="background-color: #3aa6ee;">
          <a href="${data.meetingUrl}" target="_blank" rel="noopener noreferrer"
            style="
              background-color: #3aa6ee;
              color: #ffffff;
              padding: 12px 28px;
              font-size: 14px;
              font-weight: 600;
              text-decoration: none;
              display: inline-block;
              border: 1px solid #3aa6ee;
            ">
            Join Meeting Room &rarr;
          </a>
        </td>
      </tr>
    </table>

    <!-- Divider Line -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 20px 0;">
      <tr>
        <td style="border-top: 1px solid #e2e8f0; font-size: 0; line-height: 0;">&nbsp;</td>
      </tr>
    </table>

    <p style="
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    ">
      Please ensure your microphone and audio device are configured prior to joining.
    </p>
  `;

  return mainLayout(html);
};
