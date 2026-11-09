import type { Request, Response, NextFunction } from "express";
import * as postLikeService from "../services/post-like.service";

export async function likePostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await postLikeService.likePost(req.user!.sub, Number(req.params.updateId));
    res.status(201).json({ liked: true });
  } catch (error) {
    next(error);
  }
}

export async function unlikePostHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await postLikeService.unlikePost(req.user!.sub, Number(req.params.updateId));
    res.status(200).json({ liked: false });
  } catch (error) {
    next(error);
  }
}
