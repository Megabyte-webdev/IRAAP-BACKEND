import { mainLayout } from "../layouts/mainLayout.js";

export const amendmentTemplate = (data) => {
  const html = `
    <!-- Category Tag -->
    <div style="margin-bottom: 12px;">
      <span style="
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #3aa6ee;
      ">
        Feedback & Guidance
      </span>
    </div>

    <!-- Heading -->
    <h2 style="
      margin: 0 0 16px 0;
      color: #0f172a;
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
    ">
      Project Review: "${data.projectName}"
    </h2>

    <p style="margin: 0 0 16px 0; color: #334155;">
      Hello ${data.studentName},
    </p>

    <p style="margin: 0 0 24px 0; color: #334155;">
      Your supervisor, <strong>${data.supervisorName}</strong>, has completed a review of your recent project submission. To assist you in advancing toward final verification, the following guidance was provided:
    </p>

    <!-- Callout Quote Box -->
    <div style="
      background-color: #f8fafc;
      border-left: 3px solid #3aa6ee;
      padding: 16px 20px;
      margin: 0 0 24px 0;
    ">
      <p style="
        margin: 0 0 6px 0;
        font-size: 11px;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      ">
        Supervisor Summary
      </p>
      <p style="
        margin: 0;
        font-size: 14px;
        color: #1e293b;
        line-height: 1.6;
      ">
        "${data.summary}"
      </p>
    </div>

    <p style="margin: 0 0 28px 0; color: #334155;">
      There are <strong>${data.taskCount} required amendment tasks</strong> pending on your dashboard. Please address these items and resubmit your draft.
    </p>

    <!-- Primary Action Button -->
    <div style="margin-bottom: 32px;">
      <a href="${data.dashboardUrl}/login" target="_blank" rel="noopener noreferrer"
        style="
          background-color: #3aa6ee;
          color: #ffffff;
          padding: 12px 24px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
        ">
        View Required Amendments &rarr;
      </a>
    </div>

    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 0 0 20px 0;" />

    <p style="
      font-size: 13px;
      color: #64748b;
      margin: 0;
      line-height: 1.5;
    ">
      If you have questions regarding this review, please reply directly through the portal comments section.
    </p>
  `;

  return mainLayout(html);
};
