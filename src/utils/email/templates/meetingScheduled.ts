import { mainLayout } from "../layouts/mainLayout.js";

export const meetingScheduledTemplate = (data: {
  recipientName: string;
  supervisorName: string;
  meetingTitle: string;
  meetingUrl: string;
  scheduledAt: string;
  duration?: number;
  dashboardUrl: string;
  isSupervisorConfirmation?: boolean;
}) => {
  const isSupervisor = data.isSupervisorConfirmation;
  const scheduledDate = new Date(data.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  // Format duration nicely
  const durationText = data.duration
    ? data.duration >= 60
      ? `${Math.round(data.duration / 60)} hour${data.duration / 60 > 1 ? "s" : ""}`
      : `${data.duration} minutes`
    : null;

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
      Meeting Scheduled
    </p>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 20px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      New Virtual Session Notice
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hello ${data.recipientName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      ${
        isSupervisor
          ? `You have successfully scheduled a virtual consultation: <strong>${data.meetingTitle}</strong>.`
          : `Your supervisor, <strong>${data.supervisorName}</strong>, has scheduled a virtual consultation to discuss your project progress.`
      }
    </p>

    <!-- Highlighted Schedule Banner (Table-based) -->
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

    <!-- Session Overview Data Table -->
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
          Organizer
        </td>
        <td style="padding: 12px 16px; font-size: 14px; color: #0f172a;">
          ${data.supervisorName}
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
            Enter Meeting Room &rarr;
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
      You can access the virtual boardroom at the assigned timestamp using your unique direct connection path.
    </p>
  `;

  return mainLayout(html);
};
