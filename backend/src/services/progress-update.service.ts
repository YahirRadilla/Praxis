import {
  createProgressUpdate,
  listFeedUpdates,
  listProgressUpdatesByProject,
} from "../repositories/progress-update.repository";
import { findProjectById } from "../repositories/project.repository";
import { isProjectMember } from "./team-request.service";
import { HttpError } from "../types/http-error";
import type { CreateProgressUpdateInput } from "../schemas/progress-update.schema";

export async function addProgressUpdate(
  projectId: number,
  userId: number,
  input: CreateProgressUpdateInput,
) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }

  const member = await isProjectMember(projectId, userId);
  if (!member) {
    throw new HttpError(403, "Solo los integrantes del proyecto pueden registrar avances.");
  }

  return createProgressUpdate({ projectId, authorId: userId, ...input });
}

export async function listProgressUpdates(projectId: number) {
  return listProgressUpdatesByProject(projectId);
}

export async function listFeed() {
  return listFeedUpdates();
}
