import type { Request, Response } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { z } from "zod";

import {
  organizationMemberships,
  organizations,
  organizationSubscriptions,
  users,
  projects,
  publicationRequests,
  downloads,
} from "../database/schema.js";

import { db } from "../config/db.js";
import { errorResponse, sanitizeString } from "../utils/helper.js";

import { slugifyOrganization } from "../utils/organization.js";

import { eventBus } from "../events/index.js";
import { Events } from "../utils/email/email.types.js";

const organizationSchema = z.object({
  name: z.string().min(2).max(255),
  code: z.string().max(80).optional(),
  description: z.string().max(5000).optional(),
  initialManagerName: z.union([z.string().trim().min(2).max(255), z.literal("")]).optional().transform((value) => value || undefined),
  initialManagerEmail: z.union([z.string().trim().toLowerCase().email(), z.literal("")]).optional().transform((value) => value || undefined),
}).refine(
  (value) => Boolean(value.initialManagerName) === Boolean(value.initialManagerEmail),
  { message: "Initial manager name and email must be provided together." },
);

const memberSchema = z.object({
  userId: z.number().int().positive(),
  role: z.enum(["STUDENT", "SUPERVISOR", "RESEARCHER", "MANAGER"]),
  department: z.string().max(255).optional(),
  externalRef: z.string().max(120).optional(),
});

const importSchema = z.object({
  organizationId: z.number().int().positive(),
  members: z
    .array(
      z.object({
        fullName: z.string().min(2),
        email: z.string().email(),
        role: z.enum(["STUDENT", "SUPERVISOR", "RESEARCHER"]),
        department: z.string().optional(),
        externalRef: z.string().optional(),
      }),
    )
    .min(1),
});

const subscriptionSchema = z.object({
  planCode: z.string().min(1).max(80),
  status: z.enum(["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"]),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().nullable().optional(),
  externalCustomerId: z.string().max(255).nullable().optional(),
  externalSubscriptionId: z.string().max(255).nullable().optional(),
});

export const createOrganization = async (req: Request, res: Response) => {
  const adminId = Number((req as any).user?.id);

  const parsed = organizationSchema.safeParse(req.body);

  if (!parsed.success) {
    return errorResponse(
      res,
      400,
      parsed.error.issues[0]?.message || "Invalid organization data",
    );
  }

  const cleanName = sanitizeString(parsed.data.name);

  let slug = slugifyOrganization(cleanName);

  if (!slug) {
    slug = `organization-${Date.now()}`;
  }

  try {
    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug),
    });

    if (existing) {
      slug = `${slug}-${Date.now().toString().slice(-6)}`;
    }

    const result = await db.transaction(async (tx) => {
      const [organization] = (await tx
        .insert(organizations)
        .values({
          name: cleanName,
          slug,
          code: parsed.data.code?.trim() || null,
          description: parsed.data.description
            ? sanitizeString(parsed.data.description)
            : null,
          createdBy: adminId,
          updatedAt: new Date(),
        })
        .returning()) as any;

      if (!organization) {
        throw new Error("Organization creation failed");
      }

      await tx.insert(organizationSubscriptions).values({
        organizationId: organization.id,
        planCode: "FREE",
        status: "TRIAL",
        startsAt: new Date(),
        endsAt: new Date(Date.now() + Number(process.env.FREE_TRIAL_DAYS || 14) * 24 * 60 * 60 * 1000),
      });

      if (parsed.data.initialManagerEmail && parsed.data.initialManagerName) {
        const email = parsed.data.initialManagerEmail;
        let manager = await tx.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (manager?.role === "ADMIN") {
          throw new Error("An administrator cannot be assigned as an organization manager.");
        }
        if (manager?.organizationId && manager.organizationId !== organization.id) {
          throw new Error("That user already belongs to another organization.");
        }
        if (manager) {
          const otherMembership = await tx.query.organizationMemberships.findFirst({
            where: and(eq(organizationMemberships.userId, manager.id), sql`${organizationMemberships.organizationId} <> ${organization.id}`),
          });
          if (otherMembership) throw new Error("That user already belongs to another organization.");
        }

        if (!manager) {
          const temporaryPassword = `${crypto.randomBytes(10).toString("base64url")}!A9`;
          const password = await bcrypt.hash(temporaryPassword, 12);
          [manager] = await tx.insert(users).values({
            fullName: sanitizeString(parsed.data.initialManagerName),
            email,
            password,
            role: "STUDENT",
            organizationId: organization.id,
            updatedAt: new Date(),
          }).returning();

          eventBus.emit(Events.USER_REGISTERED, {
            fullName: manager.fullName,
            email: manager.email,
            password: temporaryPassword,
            role: "Organization Manager",
            senderType: "organization-onboarding",
          });
        }

        await tx.insert(organizationMemberships).values({
          organizationId: organization.id,
          userId: manager.id,
          role: "MANAGER",
          updatedAt: new Date(),
        });

        await tx.update(users).set({
          organizationId: organization.id,
          updatedAt: new Date(),
        }).where(eq(users.id, manager.id));
      }

      return organization;
    });

    return res.status(201).json({
      organization: result,
    });
  } catch (error) {
    console.error("createOrganization error", error);
    return errorResponse(res, 500, "Failed to create organization");
  }
};

export const getOrganizations = async (_req: Request, res: Response) => {
  try {
    const data = await db.query.organizations.findMany({
      orderBy: [desc(organizations.createdAt)],

      with: {
        subscriptions: {
          orderBy: [desc(organizationSubscriptions.createdAt)],
          limit: 1,
        },
      },
    });

    const organizationsWithStats = await Promise.all(
      data.map(async (org) => {
        const [
          students,
          supervisors,
          researchers,
          projectsCount,
          publicationsCount,
        ] = await Promise.all([
          db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(organizationMemberships)
            .where(
              and(
                eq(organizationMemberships.organizationId, org.id),

                eq(organizationMemberships.role, "STUDENT"),
              ),
            ),

          db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(organizationMemberships)
            .where(
              and(
                eq(organizationMemberships.organizationId, org.id),

                eq(organizationMemberships.role, "SUPERVISOR"),
              ),
            ),

          db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(organizationMemberships)
            .where(
              and(
                eq(organizationMemberships.organizationId, org.id),

                eq(organizationMemberships.role, "RESEARCHER"),
              ),
            ),

          db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(projects)
            .where(eq(projects.organizationId, org.id)),

          db
            .select({
              count: sql<number>`count(*)::int`,
            })
            .from(publicationRequests)
            .where(eq(publicationRequests.organizationId, org.id)),
        ]);

        return {
          ...org,
          latestSubscription: org.subscriptions?.[0] ?? null,
          counts: {
            students: students[0]?.count ?? 0,
            supervisors: supervisors[0]?.count ?? 0,
            researchers: researchers[0]?.count ?? 0,
            projects: projectsCount[0]?.count ?? 0,
            publications: publicationsCount[0]?.count ?? 0,
          },
        };
      }),
    );

    return res.json({
      organizations: organizationsWithStats,
    });
  } catch (error) {
    console.error("getOrganizations error", error);

    return errorResponse(res, 500, "Failed to fetch organizations");
  }
};

export const getOrganizationMembers = async (req: Request, res: Response) => {
  const organizationId = Number(req.params.organizationId);

  if (!organizationId) {
    return errorResponse(res, 400, "Invalid organization id");
  }

  try {
    const members = await db.query.organizationMemberships.findMany({
      where: eq(organizationMemberships.organizationId, organizationId),
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
          },
        },
      },
    });

    return res.json({
      members,
    });
  } catch (error) {
    console.error("getOrganizationMembers error", error);

    return errorResponse(res, 500, "Failed to fetch organization members");
  }
};

export const addOrganizationMember = async (req: Request, res: Response) => {
  const organizationId = Number(req.params.organizationId);
  const parsed = memberSchema.safeParse(req.body);

  if (!organizationId || !parsed.success) {
    return errorResponse(res, 400, "Invalid member data");
  }

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, parsed.data.userId),
    });

    if (!user) {
      return errorResponse(res, 404, "User not found");
    }

    const [membership] = await db
      .insert(organizationMemberships)
      .values({
        organizationId,
        userId: parsed.data.userId,
        role: parsed.data.role,
        department: parsed.data.department?.trim() || null,
        externalRef: parsed.data.externalRef?.trim() || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          organizationMemberships.organizationId,
          organizationMemberships.userId,
        ],

        set: {
          role: parsed.data.role,
          department: parsed.data.department?.trim() || null,
          externalRef: parsed.data.externalRef?.trim() || null,
          updatedAt: new Date(),
        },
      })
      .returning();

    await db
      .update(users)
      .set({
        organizationId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return res.status(201).json({
      membership,
    });
  } catch (error) {
    console.error("addOrganizationMember error", error);

    return errorResponse(res, 500, "Failed to update organization membership");
  }
};

export const bulkImportOrganizationMembers = async (
  req: Request,
  res: Response,
) => {
  const parsed = importSchema.safeParse(req.body);

  if (!parsed.success) {
    return errorResponse(
      res,
      400,
      parsed.error.issues[0]?.message || "Invalid import data",
    );
  }

  try {
    let created = 0;
    let existing = 0;

    for (const member of parsed.data.members) {
      const email = member.email.toLowerCase().trim();

      let user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      let generatedPassword: string | null = null;

      if (!user) {
        const passwordSeed = email.split("@")[0];
        generatedPassword = `${passwordSeed}@irap`;
        const password = await bcrypt.hash(generatedPassword, 12);
        const [createdUser] = (await db
          .insert(users)
          .values({
            fullName: member.fullName.trim(),
            email,
            password,
            role: member.role === "SUPERVISOR" ? "SUPERVISOR" : "STUDENT",
            organizationId: parsed.data.organizationId,
            updatedAt: new Date(),
          })
          .returning()) as any;

        if (!createdUser) {
          throw new Error(`Failed to create user ${email}`);
        }

        user = createdUser;
        created += 1;
      } else {
        existing += 1;

        if (!user.organizationId) {
          await db
            .update(users)
            .set({
              organizationId: parsed.data.organizationId,
              updatedAt: new Date(),
            })
            .where(eq(users.id, user.id));
        }
      }

      await db
        .insert(organizationMemberships)
        .values({
          organizationId: parsed.data.organizationId,
          userId: user.id,
          role: member.role,
          department: member.department?.trim() || null,
          externalRef: member.externalRef?.trim() || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            organizationMemberships.organizationId,
            organizationMemberships.userId,
          ],

          set: {
            role: member.role,
            department: member.department?.trim() || null,
            externalRef: member.externalRef?.trim() || null,
            updatedAt: new Date(),
          },
        });

      if (generatedPassword) {
        eventBus.emit(Events.USER_REGISTERED, {
          fullName: user.fullName,
          email: user.email,
          password: generatedPassword,
          role:
            member.role === "SUPERVISOR"
              ? "Supervisor"
              : member.role === "RESEARCHER"
                ? "Researcher"
                : "Student",
          senderType: "organization-onboarding",
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: `Imported ${parsed.data.members.length} organization members`,
      created,
      existing,
    });
  } catch (error) {
    console.error("bulkImportOrganizationMembers error", error);
    return errorResponse(res, 500, "Failed to import organization members");
  }
};

export const removeOrganizationMember = async (req: Request, res: Response) => {
  const organizationId = Number(req.params.organizationId);
  const userId = Number(req.params.userId);

  if (!organizationId || !userId) {
    return errorResponse(res, 400, "Invalid organization or user id");
  }

  try {
    await db
      .delete(organizationMemberships)
      .where(
        and(
          eq(organizationMemberships.organizationId, organizationId),
          eq(organizationMemberships.userId, userId),
        ),
      );

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

    return res.json({
      success: true,
      message: "Organization membership removed",
    });
  } catch (error) {
    console.error("removeOrganizationMember error", error);

    return errorResponse(res, 500, "Failed to remove organization member");
  }
};

export const getOrganizationAnalytics = async (req: Request, res: Response) => {
  const organizationId = Number(req.params.organizationId);

  if (!organizationId) {
    return errorResponse(res, 400, "Invalid organization id");
  }

  try {
    const [
      members,
      activeProjects,
      approvedProjects,
      pendingPublications,
      approvedPublications,
      downloadRows,
    ] = await Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(organizationMemberships)
        .where(eq(organizationMemberships.organizationId, organizationId)),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(projects)
        .where(eq(projects.organizationId, organizationId)),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(projects)
        .where(
          and(
            eq(projects.organizationId, organizationId),
            eq(projects.status, "APPROVED"),
          ),
        ),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(publicationRequests)
        .where(
          and(
            eq(publicationRequests.organizationId, organizationId),
            eq(publicationRequests.status, "PENDING"),
          ),
        ),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(publicationRequests)
        .where(
          and(
            eq(publicationRequests.organizationId, organizationId),
            eq(publicationRequests.status, "APPROVED"),
          ),
        ),

      db
        .select({
          count: sql<number>`count(*)::int`,
        })
        .from(downloads)
        .innerJoin(projects, eq(downloads.projectId, projects.id))
        .where(eq(projects.organizationId, organizationId)),
    ]);

    return res.json({
      analytics: {
        members: members[0]?.count ?? 0,
        projects: activeProjects[0]?.count ?? 0,
        approvedProjects: approvedProjects[0]?.count ?? 0,
        pendingPublications: pendingPublications[0]?.count ?? 0,
        approvedPublications: approvedPublications[0]?.count ?? 0,
        downloads: downloadRows[0]?.count ?? 0,
      },
    });
  } catch (error) {
    console.error("getOrganizationAnalytics error", error);

    return errorResponse(res, 500, "Failed to fetch organization analytics");
  }
};

export const upsertOrganizationSubscription = async (
  req: Request,
  res: Response,
) => {
  const organizationId = Number(req.params.organizationId);
  const parsed = subscriptionSchema.safeParse(req.body);

  if (!organizationId || !parsed.success) {
    return errorResponse(res, 400, "Invalid subscription data");
  }

  try {
    const existing = await db.query.organizationSubscriptions.findFirst({
      where: eq(organizationSubscriptions.organizationId, organizationId),
      orderBy: [desc(organizationSubscriptions.createdAt)],
    });

    const values = {
      organizationId,
      planCode: parsed.data.planCode,
      status: parsed.data.status,
      startsAt: parsed.data.startsAt ?? existing?.startsAt ?? new Date(),
      endsAt: parsed.data.endsAt ?? null,
      externalCustomerId: parsed.data.externalCustomerId ?? null,
      externalSubscriptionId: parsed.data.externalSubscriptionId ?? null,
      updatedAt: new Date(),
    };

    const [subscription] = existing
      ? await db
          .update(organizationSubscriptions)
          .set(values)
          .where(eq(organizationSubscriptions.id, existing.id))
          .returning()
      : await db.insert(organizationSubscriptions).values(values).returning();

    return res.json({
      subscription,
      enforced: false,
    });
  } catch (error) {
    console.error("upsertOrganizationSubscription error", error);
    return errorResponse(res, 500, "Failed to update subscription");
  }
};
