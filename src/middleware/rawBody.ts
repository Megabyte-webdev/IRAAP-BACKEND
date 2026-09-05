import type { Request, Response, NextFunction } from "express";

export const captureRawBody = (req: Request, _res: Response, buf: Buffer) => {
  (req as any).rawBody = Buffer.from(buf);
};

export const jsonBodyWithRawCapture = {
  verify: captureRawBody,
};
