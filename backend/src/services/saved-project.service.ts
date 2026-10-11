import {
  createSavedProject,
  deleteSavedProject,
  findSavedProject,
  listSavedProjects,
} from "../repositories/saved-project.repository";
import { findProjectById } from "../repositories/project.repository";
import { HttpError } from "../types/http-error";

export async function saveProject(userId: number, projectId: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }

  const existing = await findSavedProject(userId, projectId);
  if (existing) {
    throw new HttpError(409, "Ya guardaste este proyecto.");
  }

  await createSavedProject(userId, projectId);
}

export async function unsaveProject(userId: number, projectId: number) {
  const existing = await findSavedProject(userId, projectId);
  if (!existing) {
    throw new HttpError(404, "No tenías este proyecto guardado.");
  }

  await deleteSavedProject(userId, projectId);
}

export async function listSaved(userId: number) {
  return listSavedProjects(userId);
}
