import type { Request, Response, NextFunction } from "express";
import { createProjectResourceSchema } from "../schemas/project-resource.schema";
import * as projectResourceService from "../services/project-resource.service";

export async function createProjectResourceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProjectResourceSchema.parse(req.body);
    const resource = await projectResourceService.addProjectResource(
      Number(req.params.projectId),
      req.user!.sub,
      input,
    );
    res.status(201).json(resource);
  } catch (error) {
    next(error);
  }
}

export async function listProjectResourcesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const resources = await projectResourceService.listProjectResources(
      Number(req.params.projectId),
      req.user?.sub,
    );
    res.status(200).json(resources);
  } catch (error) {
    next(error);
  }
}

export async function deleteProjectResourceHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await projectResourceService.deleteProjectResource(
      Number(req.params.projectId),
      Number(req.params.resourceId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
