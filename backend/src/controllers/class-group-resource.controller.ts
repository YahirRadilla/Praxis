import type { Request, Response, NextFunction } from "express";
import { createClassGroupResourceSchema } from "../schemas/class-group-resource.schema";
import * as classGroupResourceService from "../services/class-group-resource.service";

export async function createClassGroupResourceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = createClassGroupResourceSchema.parse(req.body);
    const resource = await classGroupResourceService.addClassGroupResource(
      Number(req.params.classGroupId),
      req.user!.sub,
      input,
    );
    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
}

export async function deleteClassGroupResourceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await classGroupResourceService.deleteClassGroupResource(
      Number(req.params.classGroupId),
      Number(req.params.resourceId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
