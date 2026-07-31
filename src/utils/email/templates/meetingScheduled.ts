import { mainLayout } from "../layouts/mainLayout.js";

export const meetingScheduledTemplate = (data: {
  recipientName: string;
  supervisorName: string;
  studentName?: string;
  meetingTitle: string;
  meetingUrl: string;
  scheduledAt: string;
  duration?: number;
  dashboardUrl: string;
  recipientType: string;
}) => {
  const isSupervisor = Boolean(data.recipientType === "supervisor");
  const scheduledDate = new Date(data.scheduledAt);

  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Africa/Lagos",
  });

  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Africa/Lagos",
  });

  // Format duration
  const durationText = data.duration
    ? data.duration >= 60
      ? `${Math.round(data.duration / 60)} hour${data.duration / 60 > 1 ? "s" : ""}`
      : `${data.duration} minutes`
    : null;

  // Role-based copy overrides
  const headingText = isSupervisor
    ? "Meeting Confirmation"
    : "New Virtual Session Notice";

  const introText = isSupervisor
    ? `You have successfully scheduled a virtual consultation titled <strong>${data.meetingTitle}</strong>${
        data.studentName ? ` with <strong>${data.studentName}</strong>` : ""
      }.`
    : `Your supervisor, <strong>${data.supervisorName}</strong>, has scheduled a virtual consultation to discuss your project progress.`;

  const footerText = isSupervisor
    ? "You can launch the meeting session directly from your supervisor dashboard at the scheduled time."
    : "You can access the virtual room at the assigned timestamp using your unique direct connection path.";

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
      ${isSupervisor ? "Meeting Scheduled" : "Upcoming Meeting"}
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      ${headingText}
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.recipientName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      ${introText}
    </p>

    <!-- Highlighted Schedule Banner -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0; border-collapse: collapse;">
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
            Date &amp; Time
          </p>
          <p style="
            margin: 0;
            font-size: 16px;
            color: #0f172a;
            font-weight: 700;
          ">
            ${formattedDate} at ${formattedTime}
          </p>
          ${
            durationText
              ? `<p style="margin: 6px 0 0 0; font-size: 13px; color: #475569; font-weight: 500;">
                  Duration: ${durationText}
                 </p>`
              : ""
          }
        </td>
      </tr>
    </table>

    <!-- Session Overview Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 28px 0; border-collapse: collapse; border: 1px solid #e2e8f0;">
      <tr>
        <td style="padding: 12px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">
          Agenda Focus
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
          ${data.meetingTitle}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; font-weight: 600;">
          ${isSupervisor ? "Participant" : "Organizer"}
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #0f172a;">
          ${isSupervisor ? data.studentName || "Assigned Student" : data.supervisorName}
        </td>
      </tr>
    </table>

    <!-- Call To Action -->
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
            ${isSupervisor ? "Start Session &rarr;" : "Enter Meeting Room &rarr;"}
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
      ${footerText}
    </p>
  `;

  return mainLayout(html);
};
