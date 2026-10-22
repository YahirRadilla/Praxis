import type { Request, Response, NextFunction } from "express";
import { createDictamenSchema } from "../schemas/dictamen.schema";
import * as dictamenService from "../services/dictamen.service";

export async function createDictamenHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createDictamenSchema.parse(req.body);
    const dictamen = await dictamenService.createDictamen(
      Number(req.params.projectId),
      req.user!.sub,
      input,
    );
    res.status(201).json(dictamen);
  } catch (error) {
    next(error);
  }
}

export async function listDictamenesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const dictamenes = await dictamenService.listDictamenes(
      Number(req.params.projectId),
      req.user?.sub,
    );
    res.status(200).json(dictamenes);
  } catch (error) {
    next(error);
  }
}
