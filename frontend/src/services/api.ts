import type { AuthResponse, AuthUser, LoginPayload, RegisterPayload } from "../types/auth";
import type {
  CreateProjectPayload,
  Project,
  ProjectPersonRef,
  SearchProjectsParams,
  Sdg,
} from "../types/project";
import type { ReceivedTeamRequest, TeamMember, TeamRequest } from "../types/team";
import type { Activity, FeedUpdate, ProgressUpdate } from "../types/activity";
import type { Challenge, CreateChallengePayload, ListChallengesParams } from "../types/challenge";

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
  payload: { name?: string; skills?: string[]; interests?: string[] },
) {
  return request<AuthUser>("/api/users/me", { method: "PATCH", token, body: payload });
}

export function listSdgsRequest() {
  return request<Sdg[]>("/api/sdgs");
}

export function createProjectRequest(token: string, payload: CreateProjectPayload) {
  return request<Project>("/api/projects", { method: "POST", token, body: payload });
}

export function searchProjectsRequest(params: SearchProjectsParams) {
  return request<Project[]>("/api/projects", {
    query: { q: params.q, sdgIds: params.sdgIds?.length ? params.sdgIds.join(",") : undefined },
  });
}

export function getProjectRequest(id: number) {
  return request<Project>(`/api/projects/${id}`);
}

export type UpdateProjectPayload = Partial<
  Omit<CreateProjectPayload, "teacherId" | "organizationId" | "challengeId">
> & {
  teacherId?: number | null;
  organizationId?: number | null;
  challengeId?: number | null;
};

export function updateProjectRequest(token: string, id: number, payload: UpdateProjectPayload) {
  return request<Project>(`/api/projects/${id}`, { method: "PATCH", token, body: payload });
}

export function publishProjectRequest(token: string, id: number) {
  return request<Project>(`/api/projects/${id}/publish`, { method: "POST", token });
}

export function submitProjectForReviewRequest(token: string, id: number) {
  return request<Project>(`/api/projects/${id}/submit-review`, { method: "POST", token });
}

export function archiveProjectRequest(token: string, id: number) {
  return request<Project>(`/api/projects/${id}/archive`, { method: "POST", token });
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

export function inviteToTeamRequest(token: string, projectId: number, userId: number) {
  return request<TeamRequest>(`/api/projects/${projectId}/team-requests/invite`, {
    method: "POST",
    token,
    body: { userId },
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

export function listTeamRequest(projectId: number) {
  return request<TeamMember[]>(`/api/projects/${projectId}/team`);
}

export function createActivityRequest(
  token: string,
  projectId: number,
  payload: { title: string; description?: string; dueDate: string; assigneeId?: number },
) {
  return request<Activity>(`/api/projects/${projectId}/activities`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function listActivitiesRequest(projectId: number) {
  return request<Activity[]>(`/api/projects/${projectId}/activities`);
}

export function updateActivityStatusRequest(
  token: string,
  projectId: number,
  activityId: number,
  status: Activity["status"],
) {
  return request<Activity>(`/api/projects/${projectId}/activities/${activityId}`, {
    method: "PATCH",
    token,
    body: { status },
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

export function listProgressUpdatesRequest(projectId: number) {
  return request<ProgressUpdate[]>(`/api/projects/${projectId}/progress-updates`);
}

export async function uploadFileRequest(
  token: string,
  file: File,
): Promise<{ url: string; fileName: string }> {
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

export function listFeedRequest() {
  return request<FeedUpdate[]>("/api/feed");
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
