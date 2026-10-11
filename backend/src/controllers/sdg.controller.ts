import type { Request, Response, NextFunction } from "express";
import { listSdgs } from "../repositories/sdg.repository";

export async function listSdgsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const sdgs = await listSdgs();
    res.status(200).json(sdgs);
  } catch (error) {
    next(error);
  }
}
