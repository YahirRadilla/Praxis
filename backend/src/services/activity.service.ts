import type { ActivityStatus } from "@prisma/client";
import {
  createActivity,
  findActivityById,
  listActivitiesByProject,
  updateActivityStatus as updateActivityStatusRepo,
} from "../repositories/activity.repository";
import { findProjectById } from "../repositories/project.repository";
import { isProjectMember } from "./team-request.service";
import { assertProjectReadable } from "./project.service";
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

  if (input.assigneeId !== undefined) {
    const assigneeIsMember = await isProjectMember(projectId, input.assigneeId);
    if (!assigneeIsMember) {
      throw new HttpError(400, "El responsable debe ser parte del equipo.");
    }
  }

  return createActivity({ projectId, ownerId: userId, ...input });
}

export async function listActivities(projectId: number, requesterId?: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  await assertProjectReadable(project, requesterId);

  return listActivitiesByProject(projectId);
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["IN_PROGRESS"],
  IN_PROGRESS: ["DONE"],
  DONE: [],
};

export async function updateActivityStatus(
  activityId: number,
  userId: number,
  status: ActivityStatus,
) {
  const activity = await findActivityById(activityId);
  if (!activity) {
    throw new HttpError(404, "Actividad no encontrada.");
  }

  const member = await isProjectMember(activity.projectId, userId);
  if (!member) {
    throw new HttpError(403, "Solo los integrantes del proyecto pueden actualizar actividades.");
  }

  const allowedTransitions = VALID_TRANSITIONS[activity.status];
  if (!allowedTransitions || !allowedTransitions.includes(status)) {
    throw new HttpError(409, "Transición de estado inválida.");
  }

  return updateActivityStatusRepo(activityId, status);
}
