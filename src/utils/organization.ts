import { and, eq } from "drizzle-orm";
import { db } from "../config/db.js";
import { organizationMemberships, organizations, users } from "../database/schema.js";

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

export const ensurePrimaryOrganization = async (userId: number) => {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { organizationId: true },
  });
  if (user?.organizationId) return user.organizationId;
  const org = await getPrimaryOrganization(userId);
  return org?.id ?? null;
};

export const slugifyOrganization = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160);
