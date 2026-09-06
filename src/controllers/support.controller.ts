import type { Request, Response } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../config/db.js";
import { supportTickets, users } from "../database/schema.js";
import { errorResponse } from "../utils/helper.js";
import { createNotification, notifyAdmins } from "../services/notifications.js";
import { sendEmail } from "../services/mail.js";

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

    await notifyAdmins({
      organizationId: ticket.organizationId,
      type: "SUPPORT_TICKET_CREATED",
      title: "New support request",
      message: `${ticket.fullName} submitted: ${ticket.subject}`,
      link: "/support",
      metadata: { ticketId: ticket.id, requesterEmail: ticket.email },
    });
    if (ticket.requesterId) {
      await createNotification({
        userId: ticket.requesterId,
        organizationId: ticket.organizationId,
        type: "SUPPORT_TICKET_CREATED",
        title: "Support request received",
        message: "Your support request was received by the IRAAP admin team.",
        link: "/contact",
        metadata: { ticketId: ticket.id },
      });
    }
    await sendEmail(ticket.email, `[IRAAP Support] Request #${ticket.id} received`, `<p>Hello ${ticket.fullName},</p><p>Your support request <strong>#${ticket.id}</strong> has been received. The IRAAP admin team will review it and get back to you.</p>`, "support");
    const admins = await db.query.users.findMany({ where: eq(users.role, "ADMIN"), columns: { email: true } });
    await Promise.all(admins.map((admin) => sendEmail(admin.email, `[IRAAP Support] New request #${ticket.id}`, `<p>A new support request was submitted by <strong>${ticket.fullName}</strong>.</p><p><strong>${ticket.subject}</strong></p><p>${ticket.message}</p>`, "support")));

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
    if (ticket.requesterId) {
      await createNotification({
        userId: ticket.requesterId,
        organizationId: ticket.organizationId,
        type: "SUPPORT_TICKET_UPDATED",
        title: `Support request ${ticket.status.toLowerCase()}`,
        message: `Your support request #${ticket.id} is now ${ticket.status.toLowerCase()}.`,
        link: "/contact",
        metadata: { ticketId: ticket.id, status: ticket.status, adminNote: ticket.adminNote },
      });
      await sendEmail(ticket.email, `[IRAAP Support] Request #${ticket.id} updated`, `<p>Hello ${ticket.fullName},</p><p>Your support request <strong>#${ticket.id}</strong> is now <strong>${ticket.status}</strong>.</p>${ticket.adminNote ? `<p>${ticket.adminNote}</p>` : ""}`, "support");
    }
    return res.json({ ticket });
  } catch (error) {
    console.error("updateSupportTicket error", error);
    return errorResponse(res, 500, "Unable to update support request");
  }
};
