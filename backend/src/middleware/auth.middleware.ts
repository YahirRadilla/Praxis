import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AppJwtPayload } from "../types/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ message: "Falta el token de autenticación." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: "JWT_SECRET no está configurado en el servidor." });
    return;
  }

  try {
    req.user = jwt.verify(token, secret) as unknown as AppJwtPayload;
    next();
  } catch {
    res.status(401).json({ message: "Token inválido o expirado." });
  }
}
