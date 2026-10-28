import {
  createDictamen as createDictamenRepo,
  listDictamenesByProject,
} from "../repositories/dictamen.repository";
import { findProjectById } from "../repositories/project.repository";
import { assertProjectInsider, assertProjectNotArchived } from "./project.service";
import { notifyUser } from "./notification.service";
import { HttpError } from "../types/http-error";
import type { CreateDictamenInput } from "../schemas/dictamen.schema";

const VERDICT_LABEL: Record<CreateDictamenInput["verdict"], string> = {
  APPROVED: "Aprobado",
  CHANGES_REQUESTED: "Cambios solicitados",
};

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

  assertProjectNotArchived(project);

  // Non-gating feedback: the Dictamen is just a history row, independent of
  // visibility/archived. Each evaluator can leave as many as they want, any
  // time the project isn't archived.
  const dictamen = await createDictamenRepo({ projectId, evaluatorId, ...input });

  await notifyUser(
    project.ownerId,
    "DICTAMEN_SUBMITTED",
    `Tu proyecto "${project.name}" recibió retroalimentación de un evaluador: ${VERDICT_LABEL[input.verdict]}.`,
    `/proyectos/${projectId}?tab=info`,
  );

  return dictamen;
}

export async function listDictamenes(projectId: number, requesterId?: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  // Plan decision #5 (default): dictamen text/history is visible only to
  // insiders (owner, accepted member, or confirmed evaluator), never to the
  // public — even on a PUBLIC project. An outsider gets 404, matching the
  // activity board's privacy model (WU-10).
  await assertProjectInsider(project, requesterId);

  return listDictamenesByProject(projectId);
}
