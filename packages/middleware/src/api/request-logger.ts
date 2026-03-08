import type { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    const logEntry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
    };

    if (req.path === "/api/submit-proof" && req.method === "POST") {
      logEntry.taskId = req.body?.taskId ?? null;
      logEntry.outcome = res.statusCode === 201 ? "pinned" : "failed";
    }

    console.log(JSON.stringify(logEntry));
  });

  next();
}
