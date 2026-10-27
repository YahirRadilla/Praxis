import { Prisma } from "@prisma/client";
import {
  createProjectLabel as createProjectLabelRepo,
  deleteProjectLabel as deleteProjectLabelRepo,
  findProjectLabelById,
  listProjectLabels as listProjectLabelsRepo,
  updateProjectLabel as updateProjectLabelRepo,
} from "../repositories/label.repository";
import { findProjectById } from "../repositories/project.repository";
import { isProjectMember } from "./team-request.service";
import { assertProjectReadable } from "./project.service";
import { HttpError } from "../types/http-error";
import type { CreateLabelInput, UpdateLabelInput } from "../schemas/label.schema";

async function assertCanManageLabels(projectId: number, userId: number) {
  const member = await isProjectMember(projectId, userId);
  if (!member) {
    throw new HttpError(403, "Solo los integrantes del proyecto pueden gestionar etiquetas.");
  }
}

async function loadLabelForWrite(projectId: number, labelId: number, userId: number) {
  const project = await findProjectById(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado.");
  await assertCanManageLabels(projectId, userId);

  const label = await findProjectLabelById(labelId);
  if (!label || label.projectId !== projectId) {
    throw new HttpError(404, "Etiqueta no encontrada.");
  }
  return label;
}

export async function listProjectLabels(projectId: number, requesterId?: number) {
  const project = await findProjectById(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado.");
  await assertProjectReadable(project, requesterId);
  return listProjectLabelsRepo(projectId);
}

export async function createProjectLabel(
  projectId: number,
  userId: number,
  input: CreateLabelInput,
) {
  const project = await findProjectById(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado.");
  await assertCanManageLabels(projectId, userId);

  try {
    return await createProjectLabelRepo({ projectId, ...input });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Ya existe una etiqueta con ese nombre en este proyecto.");
    }
    throw error;
  }
}

export async function updateProjectLabel(
  projectId: number,
  labelId: number,
  userId: number,
  input: UpdateLabelInput,
) {
  await loadLabelForWrite(projectId, labelId, userId);

  try {
    return await updateProjectLabelRepo(labelId, input);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, "Ya existe una etiqueta con ese nombre en este proyecto.");
    }
    throw error;
  }
}

export async function deleteProjectLabel(projectId: number, labelId: number, userId: number) {
  await loadLabelForWrite(projectId, labelId, userId);
  return deleteProjectLabelRepo(labelId);
}
