import {
  createClassGroupResource as createClassGroupResourceRepo,
  deleteClassGroupResource as deleteClassGroupResourceRepo,
  findClassGroupResourceById,
} from "../repositories/class-group-resource.repository";
import { findClassGroupById } from "../repositories/class-group.repository";
import { HttpError } from "../types/http-error";
import type { CreateClassGroupResourceInput } from "../schemas/class-group-resource.schema";

export async function addClassGroupResource(
  classGroupId: number,
  userId: number,
  input: CreateClassGroupResourceInput,
) {
  const classGroup = await findClassGroupById(classGroupId);
  if (!classGroup) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }
  if (classGroup.teacherId !== userId) {
    throw new HttpError(
      403,
      "Solo el docente responsable puede agregar anexos a este grupo de clase.",
    );
  }

  return createClassGroupResourceRepo({ classGroupId, creatorId: userId, ...input });
}

export async function deleteClassGroupResource(
  classGroupId: number,
  resourceId: number,
  userId: number,
) {
  const classGroup = await findClassGroupById(classGroupId);
  if (!classGroup) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }
  if (classGroup.teacherId !== userId) {
    throw new HttpError(
      403,
      "Solo el docente responsable puede borrar anexos de este grupo de clase.",
    );
  }

  const resource = await findClassGroupResourceById(resourceId);
  if (!resource || resource.classGroupId !== classGroupId) {
    throw new HttpError(404, "Anexo no encontrado.");
  }

  return deleteClassGroupResourceRepo(resourceId);
}
