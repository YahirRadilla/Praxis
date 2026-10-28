import {
  createProjectResource as createProjectResourceRepo,
  deleteProjectResource as deleteProjectResourceRepo,
  findProjectResourceById,
  listProjectResourcesByProject,
} from "../repositories/project-resource.repository";
import { findProjectById } from "../repositories/project.repository";
import { isProjectMember } from "./team-request.service";
import { assertProjectNotArchived, assertProjectReadable } from "./project.service";
import { HttpError } from "../types/http-error";
import type { CreateProjectResourceInput } from "../schemas/project-resource.schema";

export async function addProjectResource(
  projectId: number,
  userId: number,
  input: CreateProjectResourceInput,
) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  const member = await isProjectMember(projectId, userId);
  if (!member) {
    throw new HttpError(403, "Solo los integrantes del proyecto pueden agregar anexos.");
  }
  assertProjectNotArchived(project);

  return createProjectResourceRepo({ projectId, creatorId: userId, ...input });
}

export async function listProjectResources(projectId: number, requesterId?: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  await assertProjectReadable(project, requesterId);

  return listProjectResourcesByProject(projectId);
}

export async function deleteProjectResource(
  projectId: number,
  resourceId: number,
  userId: number,
) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }

  const resource = await findProjectResourceById(resourceId);
  if (!resource || resource.projectId !== projectId) {
    throw new HttpError(404, "Anexo no encontrado.");
  }
  if (resource.creatorId !== userId && project.ownerId !== userId) {
    throw new HttpError(
      403,
      "Solo quien agregó el anexo o el responsable del proyecto puede borrarlo.",
    );
  }

  return deleteProjectResourceRepo(resourceId);
}
