import type { Request, Response, NextFunction } from "express";
import * as savedProjectService from "../services/saved-project.service";

export async function saveProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await savedProjectService.saveProject(req.user!.sub, Number(req.params.id));
    res.status(201).json({ saved: true });
  } catch (error) {
    next(error);
  }
}

export async function unsaveProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await savedProjectService.unsaveProject(req.user!.sub, Number(req.params.id));
    res.status(200).json({ saved: false });
  } catch (error) {
    next(error);
  }
}

export async function listSavedProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await savedProjectService.listSaved(req.user!.sub);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
}
