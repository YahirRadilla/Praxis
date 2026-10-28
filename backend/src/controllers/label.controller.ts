import type { Request, Response, NextFunction } from "express";
import { createLabelSchema, updateLabelSchema } from "../schemas/label.schema";
import * as labelService from "../services/label.service";

export async function listLabelsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const labels = await labelService.listProjectLabels(
      Number(req.params.projectId),
      req.user?.sub,
    );
    res.status(200).json(labels);
  } catch (error) {
    next(error);
  }
}

export async function createLabelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createLabelSchema.parse(req.body);
    const label = await labelService.createProjectLabel(
      Number(req.params.projectId),
      req.user!.sub,
      input,
    );
    res.status(201).json(label);
  } catch (error) {
    next(error);
  }
}

export async function updateLabelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateLabelSchema.parse(req.body);
    const label = await labelService.updateProjectLabel(
      Number(req.params.projectId),
      Number(req.params.labelId),
      req.user!.sub,
      input,
    );
    res.status(200).json(label);
  } catch (error) {
    next(error);
  }
}

export async function deleteLabelHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await labelService.deleteProjectLabel(
      Number(req.params.projectId),
      Number(req.params.labelId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
