import type { Request, Response, NextFunction } from "express";
import { AuthError } from "../errors.js";

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.header("x-api-key");
  const expectedKey = process.env.MIDDLEWARE_API_KEY;

  if (!expectedKey) {
    res.status(500).json({ error: "Server misconfigured: API key not set" });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    next(new AuthError("Unauthorized: invalid or missing API key"));
    return;
  }

  next();
}
