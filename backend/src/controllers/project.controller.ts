import type { Request, Response, NextFunction } from "express";
import {
  createProjectSchema,
  searchProjectsQuerySchema,
  updateProjectSchema,
} from "../schemas/project.schema";
import * as projectService from "../services/project.service";

export async function createProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.createProject(req.user!.sub, input);
    res.status(201).json(project);
  } catch (error) {
    next(error);
  }
}

export async function searchProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = searchProjectsQuerySchema.parse(req.query);
    const projects = await projectService.searchProjects(query);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
}

export async function listMyProjectsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const projects = await projectService.listMyProjects(req.user!.sub);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
}

export async function getProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.getProject(Number(req.params.id), req.user?.sub);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

export async function updateProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.updateProject(Number(req.params.id), req.user!.sub, input);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

export async function publishProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.publishProject(Number(req.params.id), req.user!.sub);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

export async function submitForReviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.submitProjectForReview(Number(req.params.id), req.user!.sub);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}

export async function archiveProjectHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const project = await projectService.archiveProject(Number(req.params.id), req.user!.sub);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
}
