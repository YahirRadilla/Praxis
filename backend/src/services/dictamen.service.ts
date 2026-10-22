import {
  createDictamen as createDictamenRepo,
  findDictamenByProjectAndEvaluator,
  listDictamenesByProject,
} from "../repositories/dictamen.repository";
import { findProjectById } from "../repositories/project.repository";
import { assertProjectReadable } from "./project.service";
import { HttpError } from "../types/http-error";
import type { CreateDictamenInput } from "../schemas/dictamen.schema";

export async function createDictamen(
  projectId: number,
  evaluatorId: number,
  input: CreateDictamenInput,
) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }

  if (evaluatorId !== project.teacherId && evaluatorId !== project.organizationId) {
    throw new HttpError(
      403,
      "Solo el docente u organización vinculado a este proyecto puede emitir un dictamen.",
    );
  }

  if (project.status !== "IN_REVIEW") {
    throw new HttpError(409, "Solo se puede emitir un dictamen mientras el proyecto está en evaluación.");
  }

  const existing = await findDictamenByProjectAndEvaluator(projectId, evaluatorId);
  if (existing) {
    throw new HttpError(409, "Ya emitiste un dictamen para este proyecto.");
  }

  return createDictamenRepo({ projectId, evaluatorId, ...input });
}

export async function listDictamenes(projectId: number, requesterId?: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  await assertProjectReadable(project, requesterId);

  return listDictamenesByProject(projectId);
}
