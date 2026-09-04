import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../config/db.js";
import { supportTickets } from "../database/schema.js";
import { errorResponse } from "../utils/helper.js";

const supportSchema = z.object({
  fullName: z.string().min(2).max(255),
  email: z.string().email(),
  role: z.string().max(100).optional(),
  subject: z.string().min(2).max(255).default("General Support"),
  message: z.string().min(10).max(10000),
  organizationId: z.coerce.number().int().positive().optional(),
});

export const createSupportTicket = async (req: Request, res: Response) => {
  const parsed = supportSchema.safeParse(req.body);
  if (!parsed.success) return errorResponse(res, 400, parsed.error.issues[0]?.message || "Invalid support request");

  try {
    const userId = Number((req as any).user?.id) || null;
    const [ticket] = await db.insert(supportTickets).values({
      requesterId: userId || null,
      organizationId: parsed.data.organizationId ?? null,
      fullName: parsed.data.fullName.trim(),
      email: parsed.data.email.toLowerCase().trim(),
      role: parsed.data.role?.trim() || null,
      subject: parsed.data.subject.trim(),
      message: parsed.data.message.trim(),
    }).returning();

    return res.status(201).json({ success: true, message: "Support request submitted", ticket });
  } catch (error) {
    console.error("createSupportTicket error", error);
    return errorResponse(res, 500, "Unable to submit support request");
  }
};

export const getSupportTickets = async (req: Request, res: Response) => {
  const status = String(req.query.status || "").trim();
  try {
    const tickets = await db.query.supportTickets.findMany({
      where: status ? eq(supportTickets.status, status) : undefined,
      orderBy: [desc(supportTickets.createdAt)],
      with: { organization: { columns: { id: true, name: true } } },
    });
    return res.json({ tickets });
  } catch (error) {
    console.error("getSupportTickets error", error);
    return errorResponse(res, 500, "Unable to fetch support requests");
  }
};

export const updateSupportTicket = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (!id) return errorResponse(res, 400, "Invalid ticket id");
  const status = String(req.body?.status || "").toUpperCase();
  if (!["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].includes(status)) return errorResponse(res, 400, "Invalid support status");
  try {
    const [ticket] = await db.update(supportTickets).set({
      status,
      adminNote: req.body?.adminNote?.trim() || null,
      resolvedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null,
      updatedAt: new Date(),
    }).where(eq(supportTickets.id, id)).returning();
    if (!ticket) return errorResponse(res, 404, "Support request not found");
    return res.json({ ticket });
  } catch (error) {
    console.error("updateSupportTicket error", error);
    return errorResponse(res, 500, "Unable to update support request");
  }
};
