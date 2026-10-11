import type { Request, Response, NextFunction } from "express";
import { updateProfileSchema, searchUsersQuerySchema } from "../schemas/user.schema";
import * as userService from "../services/user.service";

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userService.getProfile(req.user!.sub);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProfileSchema.parse(req.body);
    const user = await userService.updateProfile(req.user!.sub, input);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function searchUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = searchUsersQuerySchema.parse(req.query);
    const users = await userService.searchUsers(query);
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}
