import type { Category, ProjectVisibility, Sdg } from "./project";

export type ActivityStatus = "PENDING" | "IN_PROGRESS" | "TO_VALIDATE" | "DONE" | "OVERDUE";
export type ActivityPriority = "BAJA" | "MEDIA" | "ALTA";
export type EvidenceType = "FILE" | "LINK";

export interface ActivityLabel {
  id: number;
  projectId: number;
  name: string;
  colorHex: string;
}

export interface ActivityAssignee {
  activityId: number;
  userId: number;
  assignedAt: string;
  user: { id: number; name: string };
}

export interface ActivityLabelLink {
  activityId: number;
  labelId: number;
  label: ActivityLabel;
}

export interface Activity {
  id: number;
  projectId: number;
  ownerId: number;
  title: string;
  description: string | null;
  dueDate: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: number; name: string };
  assignees: ActivityAssignee[];
  labels: ActivityLabelLink[];
  _count: { comments: number; attachments: number };
  checklistItems: { done: boolean }[];
}

export interface ChecklistItem {
  id: number;
  activityId: number;
  sectionId: number | null;
  text: string;
  note: string | null;
  done: boolean;
  position: number;
  doneById: number | null;
  doneAt: string | null;
}

export interface ChecklistSection {
  id: number;
  activityId: number;
  name: string;
  position: number;
  items: ChecklistItem[];
}

export interface ActivityComment {
  id: number;
  activityId: number;
  authorId: number;
  text: string;
  createdAt: string;
  author: { id: number; name: string };
}

export interface ActivityAttachment {
  id: number;
  activityId: number;
  uploaderId: number;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface ActivityEvent {
  id: number;
  activityId: number;
  actorId: number;
  fromStatus: ActivityStatus | null;
  toStatus: ActivityStatus;
  createdAt: string;
  actor: { id: number; name: string };
}

/**
 * Shape returned by GET /api/projects/:projectId/activities/:activityId — richer
 * than the board-list `Activity` type (checklist sections+items, comments,
 * attachments, events, and the project context used by the read-only guard).
 */
export interface ActivityDetail {
  id: number;
  projectId: number;
  ownerId: number;
  title: string;
  description: string | null;
  dueDate: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: number; name: string };
  assignees: ActivityAssignee[];
  labels: ActivityLabelLink[];
  checklistSections: ChecklistSection[];
  checklistItems: ChecklistItem[];
  comments: ActivityComment[];
  attachments: ActivityAttachment[];
  events: ActivityEvent[];
  project: { id: number; archived: boolean; ownerId: number; visibility: ProjectVisibility };
}

/**
 * Shape returned by GET /api/users/me/activities ("Mis tareas") — a single
 * activity assigned to the current user, with its project context. Unlike
 * `Activity` it carries no `assignees` (always the current user) or
 * `checklistItems`/`_count` (not needed outside the project board/table).
 */
export interface MyActivity {
  id: number;
  projectId: number;
  ownerId: number;
  title: string;
  description: string | null;
  dueDate: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  labels: ActivityLabelLink[];
  project: { id: number; name: string; archived: boolean };
}

export interface Evidence {
  id: number;
  progressUpdateId: number;
  type: EvidenceType;
  url: string;
  fileName: string | null;
  createdAt: string;
}

export interface ProgressUpdate {
  id: number;
  projectId: number;
  activityId: number | null;
  authorId: number;
  text: string;
  postedToFeed: boolean;
  validated: boolean;
  createdAt: string;
  author: { id: number; name: string };
  evidence: Evidence[];
  activity?: Activity | null;
}

export interface FeedUpdate extends ProgressUpdate {
  project: {
    id: number;
    name: string;
    sdgs: { projectId: number; sdgId: number; sdg: Sdg }[];
    categories: { projectId: number; categoryId: number; category: Category }[];
  };
}
