import { mainLayout } from "../layouts/mainLayout.js";

export const amendmentTemplate = (data) => {
  const html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="
        background-color: #eff6ff;
        color: #1e40af;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      ">
        Feedback & Guidance
      </span>
    </div>

    <h2 style="
      margin: 0 0 12px 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 700;
      text-align: center;
    ">
      Project Review: "${data.projectName}"
    </h2>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 20px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      Hello ${data.studentName}, your supervisor, <strong>${data.supervisorName}</strong>, has reviewed your recent submission.
    </p>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin: 0 auto 24px auto;
      max-width: 440px;
      line-height: 1.6;
    ">
      To help you move this project toward final approval, the following guidance has been provided:
    </p>

    <div style="
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 18px 20px;
      margin: 24px 0;
      border-radius: 6px;
    ">
      <p style="
        margin: 0 0 6px 0;
        font-size: 12px;
        font-weight: 700;
        color: #1e40af;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      ">
        Review Summary
      </p>
      <p style="
        margin: 0;
        font-size: 15px;
        color: #1e3a8a;
        line-height: 1.6;
        font-style: italic;
      ">
        "${data.summary}"
      </p>
    </div>

    <p style="
      color: #475569;
      font-size: 14px;
      text-align: center;
      margin-bottom: 28px;
    ">
      There are <strong>${data.taskCount} specific amendment tasks</strong> waiting for you on your dashboard. Please address these points and resubmit for final verification.
    </p>

    <div style="text-align: center; margin-bottom: 28px;">
      <a href="${data.dashboardUrl}" 
        style="
          background-color: #2563eb;
          color: #ffffff;
          padding: 12px 28px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        ">
        View Amendments
      </a>
    </div>

    <p style="
      font-size: 13px;
      color: #64748b;
      text-align: center;
      line-height: 1.5;
    ">
      Questions? Reach out to your supervisor via the portal comments.
    </p>
  `;

  return mainLayout(html);
};
