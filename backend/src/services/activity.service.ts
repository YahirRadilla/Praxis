import { createActivity, listActivitiesByProject } from "../repositories/activity.repository";
import { findProjectById } from "../repositories/project.repository";
import { isProjectMember } from "./team-request.service";
import { HttpError } from "../types/http-error";
import type { CreateActivityInput } from "../schemas/activity.schema";

export async function addActivity(projectId: number, userId: number, input: CreateActivityInput) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }

  const member = await isProjectMember(projectId, userId);
  if (!member) {
    throw new HttpError(403, "Solo los integrantes del proyecto pueden crear actividades.");
  }

  return createActivity({ projectId, ownerId: userId, ...input });
}

export async function listActivities(projectId: number) {
  return listActivitiesByProject(projectId);
}
