import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from "../types/auth";
import type {
  Category,
  CreateProjectPayload,
  CreateProjectResourcePayload,
  Project,
  ProjectPersonRef,
  ProjectResource,
  SearchProjectsParams,
  Sdg,
} from "../types/project";
import type { ReceivedTeamRequest, TeamMember, TeamRequest } from "../types/team";
import type {
  Activity,
  ActivityAttachment,
  ActivityComment,
  ActivityDetail,
  ActivityLabel,
  ActivityPriority,
  ActivityStatus,
  ChecklistItem,
  ChecklistSection,
  FeedUpdate,
  MyActivity,
  ProgressUpdate,
} from "../types/activity";
import type { Challenge, CreateChallengePayload, ListChallengesParams } from "../types/challenge";
import type { Dictamen, DictamenVerdict } from "../types/dictamen";
import type { Notification } from "../types/notification";
import type { ImpactStats } from "../types/impact";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly issues?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorResponse(res: Response): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new ApiError(
    body?.message ?? `La API respondió ${res.status}`,
    res.status,
    body?.issues,
  );
}

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.issues?.[0]?.message ?? error.message;
  }
  return fallback;
}

interface RequestOptions {
  method?: string;
  token?: string | null;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", token, body, query } = options;

  const url = new URL(`${API_URL}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
    }
  }

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) return parseErrorResponse(res);
  if (res.status === 204) return undefined as T;
  return res.json();
}

export async function getHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_URL}/api/health`);
  if (!res.ok) {
    throw new Error(`API respondió ${res.status}`);
  }
  return res.json();
}

export function loginRequest(payload: LoginPayload) {
  return request<AuthResponse>("/api/auth/login", { method: "POST", body: payload });
}

export function registerRequest(payload: RegisterPayload) {
  return request<AuthResponse>("/api/auth/register", { method: "POST", body: payload });
}

export function updateProfileRequest(
  token: string,
  payload: { name?: string; skills?: string[]; interests?: string[]; academicProgram?: string },
) {
  return request<AuthUser>("/api/users/me", { method: "PATCH", token, body: payload });
}

export function listSdgsRequest() {
  return request<Sdg[]>("/api/sdgs");
}

export function listCategoriesRequest() {
  return request<Category[]>("/api/categories");
}

export function createProjectRequest(token: string, payload: CreateProjectPayload) {
  return request<Project>("/api/projects", { method: "POST", token, body: payload });
}

export function searchProjectsRequest(params: SearchProjectsParams) {
  return request<Project[]>("/api/projects", {
    query: {
      q: params.q,
      sdgIds: params.sdgIds?.length ? params.sdgIds.join(",") : undefined,
      categoryIds: params.categoryIds?.length ? params.categoryIds.join(",") : undefined,
    },
  });
}

export function getProjectRequest(id: number, token?: string | null) {
  return request<Project>(`/api/projects/${id}`, { token });
}

export function getImpactRequest() {
  return request<ImpactStats>("/api/impact");
}

// `teacherId`/`organizationId` are never accepted here (plan §2 decision #6):
// the backend's `PATCH /projects/:id` is `.strict()` and 400s on them. The
// only way to link an evaluator is accepting an EVALUATOR `TeamRequest`
// (WU-05/WU-08). `evaluatorInviteIds` is create-only, so it's omitted too.
export type UpdateProjectPayload = Partial<
  Omit<CreateProjectPayload, "evaluatorInviteIds" | "challengeId">
> & {
  challengeId?: number | null;
  extendedInfo?: string | null;
};

export function updateProjectRequest(token: string, id: number, payload: UpdateProjectPayload) {
  return request<Project>(`/api/projects/${id}`, { method: "PATCH", token, body: payload });
}

export function archiveProjectRequest(token: string, id: number) {
  return request<Project>(`/api/projects/${id}/archive`, { method: "POST", token });
}

export function unarchiveProjectRequest(token: string, id: number) {
  return request<Project>(`/api/projects/${id}/unarchive`, { method: "POST", token });
}

export function requestToJoinRequest(token: string, projectId: number, message?: string) {
  return request<TeamRequest>(`/api/projects/${projectId}/team-requests`, {
    method: "POST",
    token,
    body: { message },
  });
}

export function listPendingRequestsRequest(token: string, projectId: number) {
  return request<TeamRequest[]>(`/api/projects/${projectId}/team-requests`, { token });
}

export function inviteToTeamRequest(
  token: string,
  projectId: number,
  userId: number,
  purpose?: "MEMBER" | "EVALUATOR",
) {
  return request<TeamRequest>(`/api/projects/${projectId}/team-requests/invite`, {
    method: "POST",
    token,
    body: { userId, purpose },
  });
}

export function respondToRequestRequest(
  token: string,
  requestId: number,
  status: "ACCEPTED" | "REJECTED",
) {
  return request<TeamRequest>(`/api/team-requests/${requestId}`, {
    method: "PATCH",
    token,
    body: { status },
  });
}

export function listTeamRequest(projectId: number, token?: string | null) {
  return request<TeamMember[]>(`/api/projects/${projectId}/team`, { token });
}

export function leaveTeamRequest(token: string, projectId: number) {
  return request<{ success: boolean }>(`/api/projects/${projectId}/team/me`, {
    method: "DELETE",
    token,
  });
}

export function removeTeamMemberRequest(token: string, projectId: number, userId: number) {
  return request<{ success: boolean }>(`/api/projects/${projectId}/team/${userId}`, {
    method: "DELETE",
    token,
  });
}

export function createActivityRequest(
  token: string,
  projectId: number,
  payload: {
    title: string;
    description?: string;
    dueDate: string;
    priority?: ActivityPriority;
    status?: ActivityStatus;
    assigneeIds?: number[];
    labelIds?: number[];
  },
) {
  return request<Activity>(`/api/projects/${projectId}/activities`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function listActivitiesRequest(projectId: number, token?: string | null) {
  return request<Activity[]>(`/api/projects/${projectId}/activities`, { token });
}

export function listMyActivitiesRequest(
  token: string,
  filters: { status?: ActivityStatus; projectId?: number } = {},
) {
  return request<MyActivity[]>("/api/users/me/activities", {
    token,
    query: { status: filters.status, projectId: filters.projectId },
  });
}

export function moveActivityRequest(
  token: string,
  projectId: number,
  activityId: number,
  payload: { status: ActivityStatus; position: number },
) {
  return request<Activity>(`/api/projects/${projectId}/activities/${activityId}/move`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function deleteActivityRequest(token: string, projectId: number, activityId: number) {
  return request<void>(`/api/projects/${projectId}/activities/${activityId}`, {
    method: "DELETE",
    token,
  });
}

export function getActivityDetailRequest(
  projectId: number,
  activityId: number,
  token?: string | null,
) {
  return request<ActivityDetail>(`/api/projects/${projectId}/activities/${activityId}`, { token });
}

export interface UpdateActivityPayload {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: ActivityPriority;
  assigneeIds?: number[];
  labelIds?: number[];
}

export function updateActivityRequest(
  token: string,
  projectId: number,
  activityId: number,
  payload: UpdateActivityPayload,
) {
  return request<Activity>(`/api/projects/${projectId}/activities/${activityId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

// --- Checklist sections -----------------------------------------------------

export function createChecklistSectionRequest(
  token: string,
  projectId: number,
  activityId: number,
  payload: { name: string },
) {
  return request<ChecklistSection>(
    `/api/projects/${projectId}/activities/${activityId}/checklist-sections`,
    { method: "POST", token, body: payload },
  );
}

export function updateChecklistSectionRequest(
  token: string,
  projectId: number,
  activityId: number,
  sectionId: number,
  payload: { name?: string; position?: number },
) {
  return request<ChecklistSection>(
    `/api/projects/${projectId}/activities/${activityId}/checklist-sections/${sectionId}`,
    { method: "PATCH", token, body: payload },
  );
}

export function deleteChecklistSectionRequest(
  token: string,
  projectId: number,
  activityId: number,
  sectionId: number,
) {
  return request<void>(
    `/api/projects/${projectId}/activities/${activityId}/checklist-sections/${sectionId}`,
    { method: "DELETE", token },
  );
}

// --- Checklist items ---------------------------------------------------------

export function createChecklistItemRequest(
  token: string,
  projectId: number,
  activityId: number,
  payload: { text: string; note?: string; sectionId?: number },
) {
  return request<ChecklistItem>(
    `/api/projects/${projectId}/activities/${activityId}/checklist-items`,
    { method: "POST", token, body: payload },
  );
}

export function updateChecklistItemRequest(
  token: string,
  projectId: number,
  activityId: number,
  itemId: number,
  payload: { text?: string; note?: string; sectionId?: number | null; done?: boolean; position?: number },
) {
  return request<ChecklistItem>(
    `/api/projects/${projectId}/activities/${activityId}/checklist-items/${itemId}`,
    { method: "PATCH", token, body: payload },
  );
}

export function deleteChecklistItemRequest(
  token: string,
  projectId: number,
  activityId: number,
  itemId: number,
) {
  return request<void>(
    `/api/projects/${projectId}/activities/${activityId}/checklist-items/${itemId}`,
    { method: "DELETE", token },
  );
}

// --- Comments -----------------------------------------------------------------

export function createActivityCommentRequest(
  token: string,
  projectId: number,
  activityId: number,
  payload: { text: string },
) {
  return request<ActivityComment>(`/api/projects/${projectId}/activities/${activityId}/comments`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function deleteActivityCommentRequest(
  token: string,
  projectId: number,
  activityId: number,
  commentId: number,
) {
  return request<void>(
    `/api/projects/${projectId}/activities/${activityId}/comments/${commentId}`,
    { method: "DELETE", token },
  );
}

// --- Attachments ---------------------------------------------------------------

export function createActivityAttachmentRequest(
  token: string,
  projectId: number,
  activityId: number,
  payload: { url: string; fileName: string; mimeType: string; sizeBytes: number },
) {
  return request<ActivityAttachment>(
    `/api/projects/${projectId}/activities/${activityId}/attachments`,
    { method: "POST", token, body: payload },
  );
}

export function deleteActivityAttachmentRequest(
  token: string,
  projectId: number,
  activityId: number,
  attachmentId: number,
) {
  return request<void>(
    `/api/projects/${projectId}/activities/${activityId}/attachments/${attachmentId}`,
    { method: "DELETE", token },
  );
}

// --- Project resources (Anexos) -------------------------------------------------

export function createProjectResourceRequest(
  token: string,
  projectId: number,
  payload: CreateProjectResourcePayload,
) {
  return request<ProjectResource>(`/api/projects/${projectId}/resources`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function listProjectResourcesRequest(projectId: number, token?: string | null) {
  return request<ProjectResource[]>(`/api/projects/${projectId}/resources`, { token });
}

export function deleteProjectResourceRequest(token: string, projectId: number, resourceId: number) {
  return request<void>(`/api/projects/${projectId}/resources/${resourceId}`, {
    method: "DELETE",
    token,
  });
}

// --- Labels --------------------------------------------------------------------

export function listLabelsRequest(projectId: number, token?: string | null) {
  return request<ActivityLabel[]>(`/api/projects/${projectId}/labels`, { token });
}

export function createLabelRequest(
  token: string,
  projectId: number,
  payload: { name: string; colorHex: string },
) {
  return request<ActivityLabel>(`/api/projects/${projectId}/labels`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function createProgressUpdateRequest(
  token: string,
  projectId: number,
  payload: {
    text: string;
    activityId?: number;
    postedToFeed?: boolean;
    evidence?: { type: "FILE" | "LINK"; url: string; fileName?: string }[];
  },
) {
  return request<ProgressUpdate>(`/api/projects/${projectId}/progress-updates`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function listProgressUpdatesRequest(projectId: number, token?: string | null) {
  return request<ProgressUpdate[]>(`/api/projects/${projectId}/progress-updates`, { token });
}

export async function uploadFileRequest(
  token: string,
  file: File,
): Promise<{ url: string; fileName: string; mimeType: string; sizeBytes: number }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/uploads`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) return parseErrorResponse(res);
  return res.json();
}

export function listFeedRequest(params: { categoryId?: number } = {}) {
  return request<FeedUpdate[]>("/api/feed", { query: { categoryId: params.categoryId } });
}

export function listMyProjectsRequest(token: string) {
  return request<Project[]>("/api/projects/mine", { token });
}

export function listSavedProjectsRequest(token: string) {
  return request<Project[]>("/api/projects/saved", { token });
}

export function saveProjectRequest(token: string, projectId: number) {
  return request<{ saved: boolean }>(`/api/projects/${projectId}/save`, { method: "POST", token });
}

export function unsaveProjectRequest(token: string, projectId: number) {
  return request<{ saved: boolean }>(`/api/projects/${projectId}/save`, { method: "DELETE", token });
}

export function listReceivedRequestsRequest(token: string) {
  return request<ReceivedTeamRequest[]>("/api/team-requests/received", { token });
}

export function listReceivedInvitesRequest(token: string) {
  return request<ReceivedTeamRequest[]>("/api/team-invites/received", { token });
}

export function searchUsersRequest(token: string, params: { accountType?: string; q?: string }) {
  return request<ProjectPersonRef[]>("/api/users", { token, query: params });
}

export function createChallengeRequest(token: string, payload: CreateChallengePayload) {
  return request<Challenge>("/api/challenges", { method: "POST", token, body: payload });
}

export function listChallengesRequest(params: ListChallengesParams = {}) {
  return request<Challenge[]>("/api/challenges", {
    query: { sdgIds: params.sdgIds?.length ? params.sdgIds.join(",") : undefined },
  });
}

export function getChallengeRequest(id: number) {
  return request<Challenge>(`/api/challenges/${id}`);
}

export function createDictamenRequest(
  token: string,
  projectId: number,
  payload: { verdict: DictamenVerdict; comment: string },
) {
  return request<Dictamen>(`/api/projects/${projectId}/dictamenes`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function listDictamenesRequest(projectId: number, token?: string | null) {
  return request<Dictamen[]>(`/api/projects/${projectId}/dictamenes`, { token });
}

// --- Notifications -------------------------------------------------------------

export function listNotificationsRequest(token: string, params: { unreadOnly?: boolean } = {}) {
  return request<Notification[]>("/api/notifications", {
    token,
    query: { unreadOnly: params.unreadOnly ? "true" : undefined },
  });
}

export function getUnreadCountRequest(token: string) {
  return request<{ count: number }>("/api/notifications/unread-count", { token });
}

export function markNotificationReadRequest(token: string, id: number) {
  return request<void>(`/api/notifications/${id}/read`, { method: "PATCH", token });
}

export function markAllNotificationsReadRequest(token: string) {
  return request<void>("/api/notifications/read-all", { method: "POST", token });
}
