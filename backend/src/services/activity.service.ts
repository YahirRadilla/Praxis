import {
  countActivitiesInColumn,
  countChecklistItemsInScope,
  countChecklistSections,
  createActivity,
  createActivityAttachment,
  createActivityComment,
  createActivityEvent,
  createChecklistItem,
  createChecklistSection,
  deleteActivity as deleteActivityRepo,
  deleteActivityAttachment as deleteActivityAttachmentRepo,
  deleteActivityComment as deleteActivityCommentRepo,
  deleteChecklistItem as deleteChecklistItemRepo,
  deleteChecklistSectionKeepingItems,
  findActivityAttachmentById,
  findActivityById,
  findActivityCommentById,
  findActivityFullDetail,
  findActivityWithProject,
  findChecklistItemById,
  findChecklistSectionById,
  listActivitiesAssignedToUser,
  listActivitiesByProject,
  listActivitiesByProjectAndStatus,
  runTransaction,
  updateActivity as updateActivityRepo,
  updateActivityPosition,
  updateChecklistItem as updateChecklistItemRepo,
  updateChecklistSection as updateChecklistSectionRepo,
  type ListMyActivitiesFilters,
} from "../repositories/activity.repository";
import { findProjectById } from "../repositories/project.repository";
import { countProjectLabelsByIds } from "../repositories/label.repository";
import { isProjectMember } from "./team-request.service";
import { assertProjectInsider, assertProjectNotArchived } from "./project.service";
import { notifyUser } from "./notification.service";
import { HttpError } from "../types/http-error";
import type {
  CreateActivityAttachmentInput,
  CreateActivityCommentInput,
  CreateActivityInput,
  CreateChecklistItemInput,
  CreateChecklistSectionInput,
  MoveActivityInput,
  UpdateActivityInput,
  UpdateChecklistItemInput,
  UpdateChecklistSectionInput,
} from "../schemas/activity.schema";

type ActivityWithProject = NonNullable<Awaited<ReturnType<typeof findActivityWithProject>>>;

async function loadActivityForWrite(
  projectId: number,
  activityId: number,
): Promise<ActivityWithProject> {
  const activity = await findActivityWithProject(activityId);
  if (!activity || activity.projectId !== projectId) {
    throw new HttpError(404, "Actividad no encontrada.");
  }
  return activity;
}

async function assertActivityWritable(activity: ActivityWithProject, userId: number) {
  const member = await isProjectMember(activity.projectId, userId);
  if (!member) {
    throw new HttpError(403, "Solo los integrantes del proyecto pueden modificar actividades.");
  }
  assertProjectNotArchived(activity.project);
}

// WU-10: the one board write an evaluator is allowed without being a team
// member — commenting (plan decision #8). Every other write keeps using
// assertActivityWritable (members only).
async function assertCanComment(activity: ActivityWithProject, userId: number) {
  const member = await isProjectMember(activity.projectId, userId);
  const isEvaluator =
    activity.project.teacherId === userId || activity.project.organizationId === userId;
  if (!member && !isEvaluator) {
    throw new HttpError(403, "Solo los integrantes del proyecto o el evaluador pueden comentar.");
  }
  assertProjectNotArchived(activity.project);
}

function assertActivityDeletable(activity: ActivityWithProject, userId: number) {
  if (activity.ownerId !== userId && activity.project.ownerId !== userId) {
    throw new HttpError(
      403,
      "Solo quien creó la actividad o el responsable del proyecto puede borrarla.",
    );
  }
}

async function assertAssigneesAreMembers(projectId: number, assigneeIds: number[]) {
  for (const assigneeId of assigneeIds) {
    const assigneeIsMember = await isProjectMember(projectId, assigneeId);
    if (!assigneeIsMember) {
      throw new HttpError(400, "Los responsables deben ser parte del equipo.");
    }
  }
}

async function assertLabelsBelongToProject(projectId: number, labelIds: number[]) {
  const matching = await countProjectLabelsByIds(projectId, labelIds);
  if (matching !== new Set(labelIds).size) {
    throw new HttpError(400, "Las etiquetas deben pertenecer a este proyecto.");
  }
}

export async function addActivity(projectId: number, userId: number, input: CreateActivityInput) {
  const project = await findProjectById(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado.");
  const member = await isProjectMember(projectId, userId);
  if (!member) throw new HttpError(403, "Solo los integrantes del proyecto pueden crear actividades.");
  assertProjectNotArchived(project);

  if (input.assigneeIds?.length) {
    await assertAssigneesAreMembers(projectId, input.assigneeIds);
  }
  if (input.labelIds?.length) {
    await assertLabelsBelongToProject(projectId, input.labelIds);
  }

  const status = input.status ?? "PENDING";
  const position = await countActivitiesInColumn(projectId, status);

  const created = await createActivity({ projectId, ownerId: userId, ...input, status, position });

  await createActivityEvent({
    activityId: created.id,
    actorId: userId,
    fromStatus: null,
    toStatus: created.status,
  });

  if (input.assigneeIds?.length) {
    await notifyAssignees(input.assigneeIds, projectId, project.name, created.title, created.id);
  }

  return created;
}

async function notifyAssignees(
  assigneeIds: number[],
  projectId: number,
  projectName: string,
  activityTitle: string,
  activityId: number,
) {
  await Promise.all(
    assigneeIds.map((assigneeId) =>
      notifyUser(
        assigneeId,
        "ACTIVITY_ASSIGNED",
        `Te asignaron la actividad "${activityTitle}" en el proyecto "${projectName}".`,
        `/proyectos/${projectId}/actividades/${activityId}`,
      ),
    ),
  );
}

export async function listActivities(projectId: number, requesterId?: number) {
  const project = await findProjectById(projectId);
  if (!project) throw new HttpError(404, "Proyecto no encontrado.");
  await assertProjectInsider(project, requesterId);
  return listActivitiesByProject(projectId);
}

export async function getActivityDetail(
  projectId: number,
  activityId: number,
  requesterId?: number,
) {
  const activity = await findActivityFullDetail(activityId);
  if (!activity || activity.projectId !== projectId) {
    throw new HttpError(404, "Actividad no encontrada.");
  }
  await assertProjectInsider(activity.project, requesterId);
  return activity;
}

export async function updateActivity(
  projectId: number,
  activityId: number,
  userId: number,
  input: UpdateActivityInput,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertActivityWritable(activity, userId);

  if (input.assigneeIds?.length) {
    await assertAssigneesAreMembers(projectId, input.assigneeIds);
  }
  if (input.labelIds?.length) {
    await assertLabelsBelongToProject(projectId, input.labelIds);
  }

  const updated = await updateActivityRepo(activityId, input);

  // Only notify assignees newly added by this update, not ones who were
  // already assigned (cheap to tell apart here since we already have the
  // pre-update assignee list loaded via loadActivityForWrite).
  if (input.assigneeIds?.length) {
    const previousAssigneeIds = new Set(activity.assignees.map((a) => a.userId));
    const newlyAssignedIds = input.assigneeIds.filter((id) => !previousAssigneeIds.has(id));
    if (newlyAssignedIds.length) {
      const project = await findProjectById(projectId);
      await notifyAssignees(newlyAssignedIds, projectId, project!.name, updated.title, activityId);
    }
  }

  return updated;
}

export async function deleteActivity(projectId: number, activityId: number, userId: number) {
  const activity = await loadActivityForWrite(projectId, activityId);
  assertActivityDeletable(activity, userId);
  return deleteActivityRepo(activityId);
}

/**
 * Pure reducer for drag-and-drop reordering: given the current ordering of
 * activity ids in a column, the moved activity's id, and the target index,
 * returns the full set of {id, position} updates to apply. No I/O — safe to
 * unit test in isolation.
 */
export function computeReorderedPositions(
  currentIds: number[],
  movedId: number,
  targetIndex: number,
): { id: number; position: number }[] {
  const withoutMoved = currentIds.filter((id) => id !== movedId);
  const clampedIndex = Math.min(Math.max(targetIndex, 0), withoutMoved.length);
  const reordered = [
    ...withoutMoved.slice(0, clampedIndex),
    movedId,
    ...withoutMoved.slice(clampedIndex),
  ];
  return reordered.map((id, index) => ({ id, position: index }));
}

export async function moveActivity(
  projectId: number,
  activityId: number,
  userId: number,
  input: MoveActivityInput,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertActivityWritable(activity, userId);

  const fromStatus = activity.status;
  const toStatus = input.status;
  const statusChanged = fromStatus !== toStatus;

  const completedAt = statusChanged
    ? toStatus === "DONE"
      ? new Date()
      : fromStatus === "DONE"
        ? null
        : undefined
    : undefined;

  await runTransaction(async (tx) => {
    if (!statusChanged) {
      const column = await listActivitiesByProjectAndStatus(projectId, fromStatus, tx);
      const updates = computeReorderedPositions(
        column.map((item) => item.id),
        activityId,
        input.position,
      );
      await Promise.all(
        updates.map((update) => updateActivityPosition(update.id, fromStatus, update.position, tx)),
      );
      return;
    }

    const sourceColumn = await listActivitiesByProjectAndStatus(projectId, fromStatus, tx);
    const sourceRemaining = sourceColumn.filter((item) => item.id !== activityId).map((item) => item.id);
    const sourceUpdates = sourceRemaining.map((id, index) => ({ id, position: index }));
    await Promise.all(
      sourceUpdates.map((update) => updateActivityPosition(update.id, fromStatus, update.position, tx)),
    );

    const destColumn = await listActivitiesByProjectAndStatus(projectId, toStatus, tx);
    const destUpdates = computeReorderedPositions(
      [...destColumn.map((item) => item.id), activityId],
      activityId,
      input.position,
    );
    await Promise.all(
      destUpdates.map((update) => {
        const isMoved = update.id === activityId;
        return updateActivityPosition(
          update.id,
          toStatus,
          update.position,
          tx,
          isMoved ? completedAt : undefined,
        );
      }),
    );

    await createActivityEvent(
      { activityId, actorId: userId, fromStatus, toStatus },
      tx,
    );
  });

  return findActivityById(activityId);
}

// --- Checklist sections -----------------------------------------------------

export async function addChecklistSection(
  projectId: number,
  activityId: number,
  userId: number,
  input: CreateChecklistSectionInput,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertActivityWritable(activity, userId);

  const position = await countChecklistSections(activityId);
  return createChecklistSection(activityId, input.name, position);
}

async function loadChecklistSectionForWrite(
  projectId: number,
  activityId: number,
  sectionId: number,
  userId: number,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertActivityWritable(activity, userId);

  const section = await findChecklistSectionById(sectionId);
  if (!section || section.activityId !== activityId) {
    throw new HttpError(404, "Sección no encontrada.");
  }
  return section;
}

export async function renameChecklistSection(
  projectId: number,
  activityId: number,
  sectionId: number,
  userId: number,
  input: UpdateChecklistSectionInput,
) {
  await loadChecklistSectionForWrite(projectId, activityId, sectionId, userId);
  return updateChecklistSectionRepo(sectionId, input);
}

export async function deleteChecklistSection(
  projectId: number,
  activityId: number,
  sectionId: number,
  userId: number,
) {
  await loadChecklistSectionForWrite(projectId, activityId, sectionId, userId);
  await deleteChecklistSectionKeepingItems(sectionId);
}

// --- Checklist items ---------------------------------------------------------

export async function addChecklistItem(
  projectId: number,
  activityId: number,
  userId: number,
  input: CreateChecklistItemInput,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertActivityWritable(activity, userId);

  if (input.sectionId !== undefined) {
    const section = await findChecklistSectionById(input.sectionId);
    if (!section || section.activityId !== activityId) {
      throw new HttpError(404, "Sección no encontrada.");
    }
  }

  const position = await countChecklistItemsInScope(activityId, input.sectionId ?? null);
  return createChecklistItem({
    activityId,
    text: input.text,
    note: input.note,
    sectionId: input.sectionId,
    position,
  });
}

async function loadChecklistItemForWrite(
  projectId: number,
  activityId: number,
  itemId: number,
  userId: number,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertActivityWritable(activity, userId);

  const item = await findChecklistItemById(itemId);
  if (!item || item.activityId !== activityId) {
    throw new HttpError(404, "Pendiente no encontrado.");
  }
  return item;
}

export async function updateChecklistItem(
  projectId: number,
  activityId: number,
  itemId: number,
  userId: number,
  input: UpdateChecklistItemInput,
) {
  const item = await loadChecklistItemForWrite(projectId, activityId, itemId, userId);

  if (input.sectionId !== undefined && input.sectionId !== null) {
    const section = await findChecklistSectionById(input.sectionId);
    if (!section || section.activityId !== activityId) {
      throw new HttpError(404, "Sección no encontrada.");
    }
  }

  const { done, ...rest } = input;
  const data: Parameters<typeof updateChecklistItemRepo>[1] = { ...rest };

  if (done !== undefined) {
    data.done = done;
    if (done && !item.done) {
      data.doneById = userId;
      data.doneAt = new Date();
    } else if (!done && item.done) {
      data.doneById = null;
      data.doneAt = null;
    }
  }

  return updateChecklistItemRepo(itemId, data);
}

export async function deleteChecklistItem(
  projectId: number,
  activityId: number,
  itemId: number,
  userId: number,
) {
  await loadChecklistItemForWrite(projectId, activityId, itemId, userId);
  return deleteChecklistItemRepo(itemId);
}

// --- Comments -----------------------------------------------------------------

export async function addActivityComment(
  projectId: number,
  activityId: number,
  userId: number,
  input: CreateActivityCommentInput,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertCanComment(activity, userId);

  return createActivityComment({ activityId, authorId: userId, text: input.text });
}

export async function deleteActivityComment(
  projectId: number,
  activityId: number,
  commentId: number,
  userId: number,
) {
  // Only the activity/project match is checked here (404), not activity-writable:
  // deletion of a comment is gated by authorship below, not by the activity's
  // write guard (a different, narrower rule than assertActivityDeletable).
  await loadActivityForWrite(projectId, activityId);

  const comment = await findActivityCommentById(commentId);
  if (!comment || comment.activityId !== activityId) {
    throw new HttpError(404, "Comentario no encontrado.");
  }
  if (comment.authorId !== userId) {
    throw new HttpError(403, "Solo quien escribió el comentario puede borrarlo.");
  }

  return deleteActivityCommentRepo(commentId);
}

// --- Attachments ---------------------------------------------------------------

export async function addActivityAttachment(
  projectId: number,
  activityId: number,
  userId: number,
  input: CreateActivityAttachmentInput,
) {
  const activity = await loadActivityForWrite(projectId, activityId);
  await assertActivityWritable(activity, userId);

  return createActivityAttachment({
    activityId,
    uploaderId: userId,
    url: input.url,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
}

export async function deleteActivityAttachment(
  projectId: number,
  activityId: number,
  attachmentId: number,
  userId: number,
) {
  const activity = await loadActivityForWrite(projectId, activityId);

  const attachment = await findActivityAttachmentById(attachmentId);
  if (!attachment || attachment.activityId !== activityId) {
    throw new HttpError(404, "Adjunto no encontrado.");
  }
  if (attachment.uploaderId !== userId && activity.project.ownerId !== userId) {
    throw new HttpError(
      403,
      "Solo quien subió el adjunto o el responsable del proyecto puede borrarlo.",
    );
  }

  return deleteActivityAttachmentRepo(attachmentId);
}

// --- "Mis tareas" ------------------------------------------------------------

export async function listMyActivities(userId: number, filters: ListMyActivitiesFilters = {}) {
  const assignments = await listActivitiesAssignedToUser(userId, filters);
  return assignments.map((assignment) => assignment.activity);
}
