import type { Request, Response, NextFunction } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  organizationMemberships,
  organizationSubscriptions,
  projects,
  users,
} from "../database/schema.js";

export type OrganizationContext = {
  organizationId: number;
  role: "STUDENT" | "SUPERVISOR" | "RESEARCHER" | "MANAGER";
  subscription: {
    id: number;
    planCode: string;
    status: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "EXPIRED";
    startsAt: Date;
    endsAt: Date | null;
  } | null;
};

const asContext = (req: Request) => (req as any).organization as OrganizationContext | undefined;

export const requireOrganizationRole = (roles: OrganizationContext["role"][]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = Number((req as any).user?.id);
    if (!userId) return res.status(401).json({ message: "Authentication required" });

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { id: true, role: true },
    });

    if (!user || user.role === "ADMIN") {
      return res.status(403).json({ message: "Platform administrators cannot use organization-manager access." });
    }

    const membership = await db.query.organizationMemberships.findFirst({
      where: eq(organizationMemberships.userId, userId),
      orderBy: [desc(organizationMemberships.createdAt)],
      with: { organization: true },
    });

    if (!membership || !roles.includes(membership.role)) {
      return res.status(403).json({ message: "You do not have an organization management role." });
    }

    const subscription = await db.query.organizationSubscriptions.findFirst({
      where: eq(organizationSubscriptions.organizationId, membership.organizationId),
      orderBy: [desc(organizationSubscriptions.createdAt)],
    });

    let effectiveStatus = subscription?.status ?? "EXPIRED";
    if (effectiveStatus === "TRIAL" && subscription?.endsAt && subscription.endsAt.getTime() <= Date.now()) {
      effectiveStatus = "EXPIRED";
    }

    (req as any).organization = {
      organizationId: membership.organizationId,
      role: membership.role,
      subscription: subscription
        ? {
            id: subscription.id,
            planCode: subscription.planCode,
            status: effectiveStatus,
            startsAt: subscription.startsAt,
            endsAt: subscription.endsAt,
          }
        : null,
    } satisfies OrganizationContext;

    next();
  };
};

export const requireBillingEntitlement = (
  options: { allowTrial?: boolean } = {},
) => {
  const allowTrial = options.allowTrial ?? true;
  return (req: Request, res: Response, next: NextFunction) => {
    const context = asContext(req);
    if (!context) return res.status(403).json({ message: "Organization context is missing." });

    const status = context.subscription?.status;
    if (status === "ACTIVE") return next();
    if (status === "TRIAL" && allowTrial) return next();

    return res.status(402).json({
      message: "This organization needs an active subscription to continue.",
      code: "SUBSCRIPTION_REQUIRED",
      subscriptionStatus: status ?? "EXPIRED",
    });
  };
};

export const requireTrialQuota = async (
  req: Request,
  res: Response,
  kind: "MEMBERS" | "PROJECTS" | "MANAGERS",
) => {
  const context = asContext(req);
  if (!context || context.subscription?.status !== "TRIAL") return true;

  const limits = {
    MEMBERS: Number(process.env.FREE_TRIAL_MAX_MEMBERS || 25),
    PROJECTS: Number(process.env.FREE_TRIAL_MAX_PROJECTS || 10),
    MANAGERS: Number(process.env.FREE_TRIAL_MAX_MANAGERS || 1),
  };

  const limit = limits[kind];

  if (kind === "PROJECTS") {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.organizationId, context.organizationId));
    if ((row?.count ?? 0) >= limit) {
      res.status(403).json({
        message: `Free trial limit reached: ${limit} projects.`,
        code: "TRIAL_LIMIT_REACHED",
        limit,
        resource: kind,
      });
      return false;
    }
    return true;
  }

  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, context.organizationId),
        kind === "MANAGERS"
          ? eq(organizationMemberships.role, "MANAGER")
          : sql`1 = 1`,
      ),
    );

  if ((row?.count ?? 0) >= limit) {
    res.status(403).json({
      message: `Free trial limit reached: ${limit} ${kind.toLowerCase()}.`,
      code: "TRIAL_LIMIT_REACHED",
      limit,
      resource: kind,
    });
    return false;
  }

  return true;
};
export const requireUserBillingEntitlement = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = Number((req as any).user?.id);
  if (!userId) return res.status(401).json({ message: "Authentication required" });

  const membership = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.userId, userId),
    orderBy: [desc(organizationMemberships.createdAt)],
  });

  // Personal/non-institutional users keep the existing individual workflow.
  if (!membership) return next();

  const subscription = await db.query.organizationSubscriptions.findFirst({
    where: eq(organizationSubscriptions.organizationId, membership.organizationId),
    orderBy: [desc(organizationSubscriptions.createdAt)],
  });

  let status = subscription?.status ?? "EXPIRED";
  if (status === "TRIAL" && subscription?.endsAt && subscription.endsAt.getTime() <= Date.now()) {
    status = "EXPIRED";
  }

  if (status === "ACTIVE" || status === "TRIAL") return next();

  return res.status(402).json({
    message: "Your organization's subscription has ended. Please contact an organization manager to continue.",
    code: "SUBSCRIPTION_REQUIRED",
    subscriptionStatus: status,
  });
};
