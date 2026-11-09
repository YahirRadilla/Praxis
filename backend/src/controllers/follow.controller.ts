import type { Request, Response, NextFunction } from "express";
import * as followService from "../services/follow.service";

export async function followUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await followService.followUser(req.user!.sub, Number(req.params.id));
    res.status(201).json({ following: true });
  } catch (error) {
    next(error);
  }
}

export async function unfollowUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await followService.unfollowUser(req.user!.sub, Number(req.params.id));
    res.status(200).json({ following: false });
  } catch (error) {
    next(error);
  }
}
