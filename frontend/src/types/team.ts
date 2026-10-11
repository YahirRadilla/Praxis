export type TeamRequestRole = "OWNER" | "COLLABORATOR" | "TEACHER" | "ORGANIZATION";
export type TeamRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  accountType: string;
  role: TeamRequestRole;
}

export interface TeamRequest {
  id: number;
  projectId: number;
  userId: number;
  role: TeamRequestRole;
  status: TeamRequestStatus;
  message: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: number; name: string; email: string; accountType: string };
}

export interface ReceivedTeamRequest extends TeamRequest {
  project: { id: number; name: string };
}
