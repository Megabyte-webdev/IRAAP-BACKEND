import "../listeners/email.listener.js";
import type { Request, Response } from "express";
import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../config/db.js";
import {
  billingTransactions,
  organizationMemberships,
  organizationSubscriptions,
  organizations,
  projects,
  publicationRequests,
  downloads,
  users,
} from "../database/schema.js";
import { errorResponse, sanitizeString } from "../utils/helper.js";
import { requireTrialQuota } from "../middleware/organizationAccess.js";
import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";
import { sendOnboardingEmail } from "../utils/email/onboarding.js";
import { createNotification } from "../services/notifications.js";
import { sendEmail } from "../services/mail.js";

const createManagerSchema = z.object({
  fullName: z.string().trim().min(2).max(255),
  email: z.string().trim().toLowerCase().email(),
  department: z.string().trim().max(255).optional(),
});

const roleSchema = z.object({
  role: z.enum(["STUDENT", "SUPERVISOR", "RESEARCHER", "MANAGER"]),
  department: z.string().trim().max(255).optional(),
});

const checkoutSchema = z.object({
  planCode: z.enum(["INSTITUTION", "ENTERPRISE"]),
});

const PLAN_ENV: Record<string, string | undefined> = {
  INSTITUTION: process.env.PAYSTACK_PLAN_INSTITUTION,
  ENTERPRISE: process.env.PAYSTACK_PLAN_ENTERPRISE,
};

const PLAN_AMOUNTS: Record<string, number> = {
  INSTITUTION: Number(process.env.BILLING_INSTITUTION_AMOUNT || 0),
  ENTERPRISE: Number(process.env.BILLING_ENTERPRISE_AMOUNT || 0),
};

const getContext = (req: Request) => (req as any).organization;

const getSubscription = async (organizationId: number) =>
  db.query.organizationSubscriptions.findFirst({
    where: eq(organizationSubscriptions.organizationId, organizationId),
    orderBy: [desc(organizationSubscriptions.createdAt)],
  });

export const getManagerDashboard = async (req: Request, res: Response) => {
  const ctx = getContext(req);
  try {
    const [
      members,
      managers,
      students,
      supervisors,
      researchers,
      projectsCount,
      approvedProjects,
      pendingPublications,
      downloadsCount,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.organizationId, ctx.organizationId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, ctx.organizationId),
            eq(organizationMemberships.role, "MANAGER"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, ctx.organizationId),
            eq(organizationMemberships.role, "STUDENT"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, ctx.organizationId),
            eq(organizationMemberships.role, "SUPERVISOR"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(organizationMemberships)
        .where(
          and(
            eq(organizationMemberships.organizationId, ctx.organizationId),
            eq(organizationMemberships.role, "RESEARCHER"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(eq(projects.organizationId, ctx.organizationId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, ctx.organizationId),
            eq(projects.status, "APPROVED"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(publicationRequests)
        .where(
          and(
            eq(publicationRequests.organizationId, ctx.organizationId),
            eq(publicationRequests.status, "PENDING"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(downloads)
        .innerJoin(projects, eq(downloads.projectId, projects.id))
        .where(eq(projects.organizationId, ctx.organizationId)),
    ]);
    const subscription = await getSubscription(ctx.organizationId);
    const effectiveStatus =
      subscription?.status === "TRIAL" &&
      subscription.endsAt &&
      subscription.endsAt.getTime() <= Date.now()
        ? "EXPIRED"
        : (subscription?.status ?? "EXPIRED");

    return res.json({
      organization: await db.query.organizations.findFirst({
        where: eq(organizations.id, ctx.organizationId),
      }),
      subscription: subscription
        ? { ...subscription, status: effectiveStatus }
        : null,
      stats: {
        members: members[0]?.count ?? 0,
        managers: managers[0]?.count ?? 0,
        students: students[0]?.count ?? 0,
        supervisors: supervisors[0]?.count ?? 0,
        researchers: researchers[0]?.count ?? 0,
        projects: projectsCount[0]?.count ?? 0,
        approvedProjects: approvedProjects[0]?.count ?? 0,
        pendingPublications: pendingPublications[0]?.count ?? 0,
        downloads: downloadsCount[0]?.count ?? 0,
      },
      trialLimits: {
        members: Number(process.env.FREE_TRIAL_MAX_MEMBERS || 25),
        projects: Number(process.env.FREE_TRIAL_MAX_PROJECTS || 10),
        managers: Number(process.env.FREE_TRIAL_MAX_MANAGERS || 1),
      },
    });
  } catch (error) {
    console.error("getManagerDashboard error", error);
    return errorResponse(res, 500, "Failed to load manager dashboard");
  }
};

export const getManagerMembers = async (req: Request, res: Response) => {
  const ctx = getContext(req);
  try {
    const members = await db.query.organizationMemberships.findMany({
      where: eq(organizationMemberships.organizationId, ctx.organizationId),
      orderBy: [desc(organizationMemberships.createdAt)],
      with: {
        user: {
          columns: {
            id: true,
            fullName: true,
            email: true,
            role: true,
            department: true,
            matricNumber: true,
            emailVerifiedAt: true,
          },
        },
      },
    });
    return res.json({ members });
  } catch (error) {
    console.error("getManagerMembers error", error);
    return errorResponse(res, 500, "Failed to load organization members");
  }
};

export const addOrganizationMemberByManager = async (
  req: Request,
  res: Response,
) => {
  const ctx = getContext(req);
  const schema = z.object({
    fullName: z.string().trim().min(2).max(255),
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["STUDENT", "SUPERVISOR", "RESEARCHER"]),
    department: z.string().trim().max(255).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return errorResponse(
      res,
      400,
      parsed.error.issues[0]?.message || "Invalid member data",
    );
  if (!(await requireTrialQuota(req, res, "MEMBERS"))) return;

  try {
    let user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email),
    });
    const createdNewUser = !user;

    if (user) {
      if (user.role === "ADMIN")
        return errorResponse(
          res,
          400,
          "Administrator accounts cannot be organization members.",
        );
      if (user.organizationId && user.organizationId !== ctx.organizationId) {
        return errorResponse(
          res,
          409,
          "That user already belongs to another organization.",
        );
      }
      const otherMembership = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.userId, user.id),
          sql`${organizationMemberships.organizationId} <> ${ctx.organizationId}`,
        ),
      });
      if (otherMembership)
        return errorResponse(
          res,
          409,
          "That user already belongs to another organization.",
        );

      const existing = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.organizationId, ctx.organizationId),
          eq(organizationMemberships.userId, user.id),
        ),
      });
      if (existing)
        return errorResponse(
          res,
          409,
          "That user is already a member of this organization.",
        );
    } else {
      const temporaryPassword = `${crypto.randomBytes(10).toString("base64url")}!A9`;
      const password = await bcrypt.hash(temporaryPassword, 12);
      const [created] = (await db
        .insert(users)
        .values({
          fullName: sanitizeString(parsed.data.fullName),
          email: parsed.data.email,
          password,
          role: parsed.data.role === "SUPERVISOR" ? "SUPERVISOR" : "STUDENT",
          organizationId: ctx.organizationId,
          mustChangePassword: true,
          department: parsed.data.department || null,
          updatedAt: new Date(),
        })
        .returning()) as any;
      user = created;

      await sendOnboardingEmail({
        email: created.email,
        fullName: created.fullName,
        password: temporaryPassword,
        role: parsed.data.role === "SUPERVISOR" ? "Supervisor" : parsed.data.role === "RESEARCHER" ? "Researcher" : "Student",
      });
      await createNotification({ userId: created.id, organizationId: ctx.organizationId, type: "ACCOUNT_CREATED", title: "Your IRAAP account is ready", message: "Your organization account was created. Sign in and change your temporary password.", link: "/login" });
    }

    const isExistingAccount = !createdNewUser;
    const memberRoleLabel = parsed.data.role[0] + parsed.data.role.slice(1).toLowerCase();

    const [membership] = await db
      .insert(organizationMemberships)
      .values({
        organizationId: ctx.organizationId,
        userId: user.id,
        role: parsed.data.role,
        department: parsed.data.department || null,
        updatedAt: new Date(),
      })
      .returning();

    await db
      .update(users)
      .set({
        organizationId: ctx.organizationId,
        department: parsed.data.department || user.department || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    if (isExistingAccount) {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, ctx.organizationId),
        columns: { id: true, name: true },
      });
      const organizationName = organization?.name || "your organization";

      await createNotification({
        userId: user.id,
        organizationId: ctx.organizationId,
        type: "ORGANIZATION_MEMBER_ADDED",
        title: `Added to ${organizationName}`,
        message: `You have been added to ${organizationName} as a ${memberRoleLabel}.`,
        link: "/chat",
        metadata: { organizationId: ctx.organizationId, role: parsed.data.role },
      });

      await sendEmail(
        user.email,
        `[IRAAP] You have been added to ${organizationName}`,
        `<p>Hello ${user.fullName},</p><p>You have been added to <strong>${organizationName}</strong> as a <strong>${memberRoleLabel}</strong>.</p><p>Your existing IRAAP account is still your account. You can sign in normally and access your organization workspace.</p>`,
        "onboarding",
      );
    }

    return res.status(201).json({ membership, existingAccount: isExistingAccount });
  } catch (error) {
    console.error("addOrganizationMemberByManager error", error);
    return errorResponse(res, 500, "Failed to add organization member");
  }
};

export const createOrganizationManager = async (
  req: Request,
  res: Response,
) => {
  const ctx = getContext(req);
  const parsed = createManagerSchema.safeParse(req.body);
  if (!parsed.success)
    return errorResponse(
      res,
      400,
      parsed.error.issues[0]?.message || "Invalid manager data",
    );
  if (!(await requireTrialQuota(req, res, "MANAGERS"))) return;

  try {
    const email = parsed.data.email;
    let user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    const createdNewUser = !user;

    if (user) {
      if (user.role === "ADMIN")
        return errorResponse(
          res,
          400,
          "Administrator accounts cannot be organization managers.",
        );
      if (user.organizationId && user.organizationId !== ctx.organizationId) {
        return errorResponse(
          res,
          409,
          "That user already belongs to another organization.",
        );
      }
      const otherMembership = await db.query.organizationMemberships.findFirst({
        where: and(
          eq(organizationMemberships.userId, user.id),
          sql`${organizationMemberships.organizationId} <> ${ctx.organizationId}`,
        ),
      });
      if (otherMembership)
        return errorResponse(
          res,
          409,
          "That user already belongs to another organization.",
        );

      const existingMembership =
        await db.query.organizationMemberships.findFirst({
          where: and(
            eq(organizationMemberships.organizationId, ctx.organizationId),
            eq(organizationMemberships.userId, user.id),
          ),
        });
      if (existingMembership)
        return errorResponse(
          res,
          409,
          "That user is already a member of this organization.",
        );
    } else {
      const temporaryPassword = `${crypto.randomBytes(10).toString("base64url")}!A9`;
      const password = await bcrypt.hash(temporaryPassword, 12);
      const [created] = (await db
        .insert(users)
        .values({
          fullName: sanitizeString(parsed.data.fullName),
          email,
          password,
          role: "STUDENT",
          organizationId: ctx.organizationId,
          mustChangePassword: true,
          updatedAt: new Date(),
        })
        .returning()) as any;
      user = created;
      await sendOnboardingEmail({
        email: created.email,
        fullName: created.fullName,
        password: temporaryPassword,
        role: "Organization Manager",
      });
      await createNotification({ userId: created.id, organizationId: ctx.organizationId, type: "ACCOUNT_CREATED", title: "Manager account created", message: "Your IRAAP organization manager account is ready. Sign in and change your temporary password.", link: "/login" });
    }

    const [membership] = await db.transaction(async (tx) => {
      const [m] = await tx
        .insert(organizationMemberships)
        .values({
          organizationId: ctx.organizationId,
          userId: user!.id,
          role: "MANAGER",
          department: parsed.data.department || null,
          updatedAt: new Date(),
        })
        .returning();

      await tx
        .update(users)
        .set({
          organizationId: ctx.organizationId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user!.id));

      return [m] as const;
    });

    if (!createdNewUser) {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, ctx.organizationId),
        columns: { id: true, name: true },
      });
      const organizationName = organization?.name || "your organization";
      await createNotification({
        userId: user.id,
        organizationId: ctx.organizationId,
        type: "ORGANIZATION_MANAGER_ASSIGNED",
        title: `You are now a manager of ${organizationName}`,
        message: `You have been given organization manager access in ${organizationName}.`,
        link: "/manager",
        metadata: { organizationId: ctx.organizationId, role: "MANAGER" },
      });
      await sendEmail(
        user.email,
        `[IRAAP] You are now a manager of ${organizationName}`,
        `<p>Hello ${user.fullName},</p><p>You have been added as an <strong>organization manager</strong> for <strong>${organizationName}</strong>.</p><p>Sign in with your existing IRAAP account to manage members, research activity, and billing.</p>`,
        "onboarding",
      );
    }

    return res.status(201).json({ membership, existingAccount: !createdNewUser });
  } catch (error: any) {
    console.error("createOrganizationManager error", error);
    return errorResponse(res, 500, "Failed to add manager");
  }
};

export const updateOrganizationMemberRole = async (
  req: Request,
  res: Response,
) => {
  const ctx = getContext(req);
  const userId = Number(req.params.userId);
  const parsed = roleSchema.safeParse(req.body);
  if (!userId || !parsed.success)
    return errorResponse(res, 400, "Invalid role update");
  if (
    userId === Number((req as any).user?.id) &&
    parsed.data.role !== "MANAGER"
  ) {
    return errorResponse(
      res,
      400,
      "You cannot remove your own manager access.",
    );
  }

  try {
    const membership = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, ctx.organizationId),
        eq(organizationMemberships.userId, userId),
      ),
    });
    if (!membership)
      return errorResponse(res, 404, "Organization member not found");

    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, role: true },
    });
    if (!targetUser) return errorResponse(res, 404, "User not found");
    if (targetUser.role === "ADMIN" && parsed.data.role === "MANAGER") {
      return errorResponse(
        res,
        400,
        "Administrator accounts cannot be organization managers.",
      );
    }

    if (membership.role !== "MANAGER" && parsed.data.role === "MANAGER") {
      if (!(await requireTrialQuota(req, res, "MANAGERS"))) return;
    }

    const [updated] = await db
      .update(organizationMemberships)
      .set({
        role: parsed.data.role,
        department: parsed.data.department || null,
        updatedAt: new Date(),
      })
      .where(eq(organizationMemberships.id, membership.id))
      .returning();

    await db
      .update(users)
      .set({
        organizationId: ctx.organizationId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, ctx.organizationId),
      columns: { name: true },
    });
    await createNotification({
      userId,
      organizationId: ctx.organizationId,
      type: "ORGANIZATION_ROLE_UPDATED",
      title: "Your organization role changed",
      message: `Your role in ${organization?.name || "the organization"} is now ${parsed.data.role}.`,
      link: parsed.data.role === "MANAGER" ? "/manager" : "/chat",
      metadata: { organizationId: ctx.organizationId, role: parsed.data.role },
    });

    return res.json({ membership: updated });
  } catch (error) {
    console.error("updateOrganizationMemberRole error", error);
    return errorResponse(res, 500, "Failed to update organization member");
  }
};

export const removeOrganizationMemberByManager = async (
  req: Request,
  res: Response,
) => {
  const ctx = getContext(req);
  const userId = Number(req.params.userId);
  const requesterId = Number((req as any).user?.id);
  if (!userId) return errorResponse(res, 400, "Invalid user id");
  if (userId === requesterId)
    return errorResponse(
      res,
      400,
      "You cannot remove your own organization membership.",
    );

  try {
    const target = await db.query.organizationMemberships.findFirst({
      where: and(
        eq(organizationMemberships.organizationId, ctx.organizationId),
        eq(organizationMemberships.userId, userId),
      ),
    });
    if (!target)
      return errorResponse(res, 404, "Organization member not found");

    await db
      .delete(organizationMemberships)
      .where(eq(organizationMemberships.id, target.id));
    const remaining = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId),
    });
    await db
      .update(users)
      .set({
        organizationId: remaining?.organizationId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, ctx.organizationId),
      columns: { name: true },
    });
    await createNotification({
      userId,
      organizationId: ctx.organizationId,
      type: "ORGANIZATION_MEMBER_REMOVED",
      title: `Removed from ${organization?.name || "organization"}`,
      message: `Your membership in ${organization?.name || "the organization"} has been removed. Your IRAAP account remains active.`,
      link: "/dashboard",
      metadata: { organizationId: ctx.organizationId },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error("removeOrganizationMemberByManager error", error);
    return errorResponse(res, 500, "Failed to remove organization member");
  }
};

export const initializeOrganizationCheckout = async (
  req: Request,
  res: Response,
) => {
  const ctx = getContext(req);
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success)
    return errorResponse(res, 400, "Invalid subscription plan");

  const secret = process.env.PAYSTACK_SECRET_KEY;
  const callbackUrl = process.env.PAYSTACK_CALLBACK_URL;
  const planCode = PLAN_ENV[parsed.data.planCode];
  const amount = PLAN_AMOUNTS[parsed.data.planCode];

  if (!secret || !callbackUrl || !planCode || !amount) {
    return errorResponse(
      res,
      503,
      "Billing is not configured. Set the Paystack environment variables before enabling paid plans.",
    );
  }

  try {
    const manager = await db.query.users.findFirst({
      where: eq(users.id, Number((req as any).user.id)),
      columns: { email: true },
    });
    if (!manager) return errorResponse(res, 401, "Manager account not found");

    const reference = `iraap_${ctx.organizationId}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: manager.email,
          amount: String(amount),
          plan: planCode,
          callback_url: callbackUrl,
          reference,
          currency: process.env.BILLING_CURRENCY || "NGN",
          metadata: {
            organizationId: ctx.organizationId,
            planCode: parsed.data.planCode,
            initiatedBy: Number((req as any).user.id),
          },
        }),
      },
    );
    const data: any = await response.json();
    if (!response.ok || !data.status) {
      console.error("Paystack initialize failed", data);
      return errorResponse(res, 502, "Unable to initialize payment");
    }

    await db.insert(billingTransactions).values({
      organizationId: ctx.organizationId,
      reference,
      planCode: parsed.data.planCode,
      amount,
      currency: process.env.BILLING_CURRENCY || "NGN",
      customerEmail: manager.email,
      status: "PENDING",
      updatedAt: new Date(),
    });

    return res.json({
      authorizationUrl: data.data.authorization_url,
      reference,
    });
  } catch (error) {
    console.error("initializeOrganizationCheckout error", error);
    return errorResponse(res, 502, "Unable to start payment");
  }
};

export const verifyOrganizationCheckout = async (
  req: Request,
  res: Response,
) => {
  const ctx = getContext(req);
  const reference = String(req.params.reference || "");
  if (!/^[A-Za-z0-9_.=-]{10,120}$/.test(reference))
    return errorResponse(res, 400, "Invalid payment reference");

  try {
    const tx = await db.query.billingTransactions.findFirst({
      where: eq(billingTransactions.reference, reference),
    });
    if (!tx || tx.organizationId !== ctx.organizationId)
      return errorResponse(res, 404, "Payment not found");

    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      },
    );
    const data: any = await response.json();
    if (!response.ok || !data.status || data.data?.status !== "success") {
      return res.json({ paid: false, status: data.data?.status ?? "pending" });
    }

    await fulfillSuccessfulPayment(reference, data.data);
    return res.json({ paid: true });
  } catch (error) {
    console.error("verifyOrganizationCheckout error", error);
    return errorResponse(res, 502, "Unable to verify payment");
  }
};

export const getOrganizationBilling = async (req: Request, res: Response) => {
  try {
    const ctx = getContext(req);
    const subscription = await getSubscription(ctx.organizationId);

    const transactions = await db.query.billingTransactions.findMany({
      where: eq(
        billingTransactions.organizationId,
        ctx.organizationId,
      ),
      orderBy: [desc(billingTransactions.createdAt)],
      limit: 20,
    });

    return res.json({
      success: true,
      subscription,
      transactions,
      plans: {
        INSTITUTION: {
          paystackPlanCode: Boolean(PLAN_ENV.INSTITUTION),
          amount: PLAN_AMOUNTS.INSTITUTION,
          currency:
            process.env.BILLING_CURRENCY || "NGN",
          interval:
            process.env.BILLING_INTERVAL || "monthly",
        },
        ENTERPRISE: {
          paystackPlanCode: Boolean(PLAN_ENV.ENTERPRISE),
          amount: PLAN_AMOUNTS.ENTERPRISE,
          currency:
            process.env.BILLING_CURRENCY || "NGN",
          interval:
            process.env.BILLING_INTERVAL || "monthly",
        },
      },
    });
  } catch (error) {
    console.error(
      "getOrganizationBilling error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to load organization billing right now.",
      code: "BILLING_QUERY_FAILED",
    });
  }
};

export const paystackWebhook = async (req: Request, res: Response) => {
  const signature = req.headers["x-paystack-signature"];
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || typeof signature !== "string")
    return res.status(401).json({ message: "Invalid webhook signature" });

  const rawBody = (req as any).rawBody as Buffer | undefined;
  const bodyBuffer = rawBody ?? Buffer.from(JSON.stringify(req.body));
  const expected = crypto
    .createHmac("sha512", secret)
    .update(bodyBuffer)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  try {
    const event = String(req.body?.event || "");
    const reference = req.body?.data?.reference;
    if (event === "charge.success" && reference) {
      await fulfillSuccessfulPayment(reference, req.body.data);
    } else if (
      event === "invoice.payment_failed" &&
      req.body?.data?.subscription_code
    ) {
      const sub = await db.query.organizationSubscriptions.findFirst({
        where: eq(
          organizationSubscriptions.externalSubscriptionId,
          req.body.data.subscription_code,
        ),
      });
      if (sub) {
        await db
          .update(organizationSubscriptions)
          .set({ status: "PAST_DUE", updatedAt: new Date() })
          .where(eq(organizationSubscriptions.id, sub.id));
      }
    } else if (
      event === "subscription.disable" &&
      req.body?.data?.subscription_code
    ) {
      const sub = await db.query.organizationSubscriptions.findFirst({
        where: eq(
          organizationSubscriptions.externalSubscriptionId,
          req.body.data.subscription_code,
        ),
      });
      if (sub) {
        await db
          .update(organizationSubscriptions)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(eq(organizationSubscriptions.id, sub.id));
      }
    }

    return res.json({ received: true });
  } catch (error) {
    console.error("paystackWebhook error", error);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
};

async function fulfillSuccessfulPayment(reference: string, data: any) {
  const tx = await db.query.billingTransactions.findFirst({
    where: eq(billingTransactions.reference, reference),
  });
  if (!tx || tx.status === "PAID") return;

  const subscription = await db.query.organizationSubscriptions.findFirst({
    where: eq(organizationSubscriptions.organizationId, tx.organizationId),
    orderBy: [desc(organizationSubscriptions.createdAt)],
  });

  const now = new Date();
  const endsAt = new Date(
    now.getTime() +
      Number(process.env.BILLING_TERM_DAYS || 30) * 24 * 60 * 60 * 1000,
  );

  await db.transaction(async (dbtx) => {
    await db
      .update(billingTransactions)
      .set({
        status: "PAID",
        paidAt: data?.paid_at ? new Date(data.paid_at) : now,
        updatedAt: now,
      })
      .where(eq(billingTransactions.id, tx.id));

    const subscriptionPayload = {
      organizationId: tx.organizationId,
      planCode: tx.planCode,
      status: "ACTIVE" as const,
      startsAt: now,
      endsAt,
      externalCustomerId: data?.customer?.customer_code ?? null,
      externalSubscriptionId: data?.subscription_code ?? null,
      updatedAt: now,
    };

    if (subscription) {
      await dbtx
        .update(organizationSubscriptions)
        .set(subscriptionPayload)
        .where(eq(organizationSubscriptions.id, subscription.id));
    } else {
      await dbtx.insert(organizationSubscriptions).values(subscriptionPayload);
    }
  });
}
