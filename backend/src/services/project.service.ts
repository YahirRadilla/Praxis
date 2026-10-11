import {
  createProject as createProjectRepo,
  findProjectById,
  listProjectsForUser,
  searchProjects as searchProjectsRepo,
  updateProject as updateProjectRepo,
  type CreateProjectData,
} from "../repositories/project.repository";
import { HttpError } from "../types/http-error";
import type {
  CreateProjectInput,
  SearchProjectsQuery,
  UpdateProjectInput,
} from "../schemas/project.schema";

export async function createProject(ownerId: number, input: CreateProjectInput) {
  const data: CreateProjectData = { ownerId, ...input };
  return createProjectRepo(data);
}

export async function getProject(id: number) {
  const project = await findProjectById(id);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  return project;
}

export async function searchProjects(query: SearchProjectsQuery) {
  return searchProjectsRepo(query);
}

export async function listMyProjects(userId: number) {
  return listProjectsForUser(userId);
}

async function requireOwnedProject(id: number, userId: number) {
  const project = await findProjectById(id);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId !== userId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede modificarlo.");
  }
  return project;
}

export async function updateProject(id: number, userId: number, input: UpdateProjectInput) {
  await requireOwnedProject(id, userId);
  return updateProjectRepo(id, input);
}

export async function publishProject(id: number, userId: number) {
  const project = await requireOwnedProject(id, userId);
  if (project.status !== "DRAFT") {
    throw new HttpError(409, "El proyecto ya fue publicado.");
  }
  return updateProjectRepo(id, { status: "PUBLISHED" });
}
