import type { Request, Response, NextFunction } from "express";
import { loginSchema, registerSchema, verifyGoogleSchema } from "../schemas/auth.schema";
import * as authService from "../services/auth.service";

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function verifyGoogleHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = verifyGoogleSchema.parse(req.body);
    const result = await authService.verifyAccountWithGoogle(req.user!.sub, input.idToken);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
