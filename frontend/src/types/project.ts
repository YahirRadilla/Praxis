export type ProjectVisibility = "PUBLIC" | "PRIVATE";

export interface Sdg {
  id: number;
  name: string;
  colorHex: string;
}

export interface Category {
  id: number;
  name: string;
  colorHex: string;
  icon: string;
}

// WU-13 (plan decision #11): email is only present when the requester is an
// insider of the project this person belongs to (owner, accepted member, or
// confirmed evaluator) — omitted entirely for an outsider or anonymous
// visitor, even on a PUBLIC project. Render it conditionally.
export interface ProjectPersonRef {
  id: number;
  name: string;
  email?: string;
  accountType: string;
}

// WU-07: computed once on the backend per (project, requester) pair — the
// single source of truth for what the current viewer can do/see on this
// project. Omitted entirely for an anonymous requester and for `GET
// /projects` (public search); the frontend never re-derives these.
export interface ProjectViewer {
  isOwner: boolean;
  isMember: boolean;
  isEvaluator: boolean;
  pendingRequest: {
    id: number;
    initiatedBy: "REQUESTER" | "OWNER";
    purpose: "MEMBER" | "EVALUATOR";
  } | null;
  canRequestToJoin: boolean;
  canPost: boolean;
  canSubmitDictamen: boolean;
  canSeeBoard: boolean;
}

// WU-08 gap fix: only present for the owner's own `GET /projects/:id`
// request — the owner's pending outgoing EVALUATOR invites, by slot, so
// "Invitación pendiente: X" survives a page reload.
export interface PendingEvaluatorInvites {
  teacher: { id: number; name: string } | null;
  organization: { id: number; name: string } | null;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  problemStatement: string;
  objectives: string;
  extendedInfo: string | null;
  visibility: ProjectVisibility;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: number;
  teacherId: number | null;
  organizationId: number | null;
  owner: ProjectPersonRef;
  teacher: ProjectPersonRef | null;
  organization: ProjectPersonRef | null;
  sdgs: { projectId: number; sdgId: number; sdg: Sdg }[];
  categories: { projectId: number; categoryId: number; category: Category }[];
  challenge: { id: number; title: string } | null;
  viewer?: ProjectViewer;
  pendingEvaluatorInvites?: PendingEvaluatorInvites;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  problemStatement: string;
  objectives: string;
  sdgIds: number[];
  categoryIds: number[];
  // Evaluator invitations sent alongside creation (plan §2 decision #6, §7
  // P4, WU-05/WU-08): these never fill `teacherId`/`organizationId`
  // directly — they create PENDING EVALUATOR `TeamRequest` rows the target
  // accepts later. `teacherId`/`organizationId` are not, and will never be,
  // accepted as creation fields.
  evaluatorInviteIds?: number[];
  visibility?: ProjectVisibility;
  challengeId?: number;
}

export interface SearchProjectsParams {
  q?: string;
  sdgIds?: number[];
  categoryIds?: number[];
}

export type ResourceType = "FILE" | "LINK";

export interface ProjectResource {
  id: number;
  projectId: number;
  creatorId: number;
  type: ResourceType;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  label: string;
  description: string | null;
  createdAt: string;
  creator: { id: number; name: string };
}

export interface CreateProjectResourcePayload {
  type: ResourceType;
  url: string;
  label: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}
