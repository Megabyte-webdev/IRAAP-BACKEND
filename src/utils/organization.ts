import { and, eq, isNull } from "drizzle-orm";
import { db } from "../config/db.js";
import {
  organizationMemberships,
  organizations,
  users,
  projects,
  publicationRequests,
} from "../database/schema.js";

export const getPrimaryOrganization = async (userId: number) => {
  const membership = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.userId, userId),
    with: { organization: true },
  });
  return membership?.organization ?? null;
};

export const userBelongsToOrganization = async (
  userId: number,
  organizationId: number,
  roles?: string[],
) => {
  const membership = await db.query.organizationMemberships.findFirst({
    where: and(
      eq(organizationMemberships.userId, userId),
      eq(organizationMemberships.organizationId, organizationId),
    ),
  });
  if (!membership) return false;
  if (roles?.length && !roles.includes(membership.role)) return false;
  return true;
};

/**
 * Attach legacy, unscoped research records to the member's new organization.
 * Existing account data is never deleted; only NULL organization links are
 * populated so a user's previous work follows them into their organization.
 */
export const syncExistingUserOrganizationData = async (
  userId: number,
  organizationId: number,
  membershipRole: string,
) => {
  const result = await db.transaction(async (tx) => {
    const projectResult = await tx
      .update(projects)
      .set({ organizationId, updatedAt: new Date() })
      .where(
        and(
          isNull(projects.organizationId),
          eq(projects.studentId, userId),
        ),
      )
      .returning({ id: projects.id });

    const supervisedResult =
      membershipRole === "SUPERVISOR"
        ? await tx
            .update(projects)
            .set({ organizationId, updatedAt: new Date() })
            .where(
              and(
                isNull(projects.organizationId),
                eq(projects.supervisorId, userId),
              ),
            )
            .returning({ id: projects.id })
        : [];

    const publicationResult = await tx
      .update(publicationRequests)
      .set({ organizationId })
      .where(
        and(
          isNull(publicationRequests.organizationId),
          eq(publicationRequests.requesterId, userId),
        ),
      )
      .returning({ id: publicationRequests.id });

    return {
      projectsLinked: projectResult.length + supervisedResult.length,
      publicationsLinked: publicationResult.length,
    };
  });

  return result;
};

export const ensurePrimaryOrganization = async (userId: number) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      organizationId: true,
    },
  });

  if (user?.organizationId) {
    return user.organizationId;
  }

  const membership = await db.query.organizationMemberships.findFirst({
    where: eq(organizationMemberships.userId, userId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    columns: { organizationId: true },
  });

  if (membership?.organizationId) {
    await db
      .update(users)
      .set({ organizationId: membership.organizationId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  return membership?.organizationId ?? null;
};

export const slugifyOrganization = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
