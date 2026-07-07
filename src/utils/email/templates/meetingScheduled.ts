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
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="background-color: #fef3c7; color: #92400e; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;">
        Meeting Scheduled
      </span>
    </div>

    <h2 style="margin: 0 0 16px 0; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">
      New Meeting Invitation
    </h2>

    <p style="color: #475569; font-size: 14px; text-align: center; margin: 0 0 24px 0; line-height: 1.6;">
      Hello <strong>${data.recipientName}</strong>,
      ${
        isSupervisor
          ? `you have scheduled a meeting: <strong>${data.meetingTitle}</strong>.`
          : `your supervisor, <strong>${data.supervisorName}</strong>, has scheduled a virtual consultation to discuss project progress.`
      }
    </p>

    <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 11px; color: #92400e; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">
        Date & Time
      </p>
      <p style="margin: 6px 0 0 0; font-size: 16px; color: #b45309; font-weight: 800;">
        ${formattedDate} at ${formattedTime}
      </p>
      ${
        durationText
          ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #d97706; font-weight: 500;">
              Duration: ${durationText}
             </p>`
          : ""
      }
    </div>

    <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 24px 0;">
      <table width="100%" style="border-collapse: collapse;">
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; border-bottom: 1px solid #e2e8f0; font-weight: 600;">Agenda Focus</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${data.meetingTitle}</td>
        </tr>
        <tr>
          <td style="padding: 14px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; width: 30%; font-weight: 600;">Organizer</td>
          <td style="padding: 14px 16px; font-size: 14px; color: #0f172a;">${data.supervisorName}</td>
        </tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0; text-align: center;">
      You can access the virtual boardroom at the assigned timestamp using your unique direct connection path.
    </p>

    <div style="text-align: center; margin-top: 28px; padding-bottom: 8px;">
      <a href="${data.meetingUrl}" target="_blank" rel="noopener noreferrer" style="background-color: #d97706; color: #ffffff; padding: 12px 28px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none; display: inline-block;">
        Enter Meeting Room
      </a>
    </div>
  `;

  return mainLayout(html);
};
