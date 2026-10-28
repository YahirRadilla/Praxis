export type TeamRequestRole = "OWNER" | "COLLABORATOR" | "TEACHER" | "ORGANIZATION";
export type TeamRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED";
// Whether the row's own purpose is team membership or evaluator linking
// (plan §2 decision #7, WU-04/WU-08). A request/invite never mixes both.
export type TeamRequestPurpose = "MEMBER" | "EVALUATOR";
// Who started the row: the person asking to join ("REQUESTER") or the
// project owner inviting them ("OWNER"). Drives which side can Accept/Reject
// it (WU-06).
export type TeamRequestInitiator = "REQUESTER" | "OWNER";

// WU-13 (plan decision #11): email is only present when the requester is an
// insider of the project (owner, accepted member, or confirmed evaluator) —
// omitted for an outsider/anonymous visitor on `GET /projects/:id/team`.
// The owner's own pending/received requests always keep it (the owner is
// always an insider of their own project).
export interface TeamMember {
  id: number;
  name: string;
  email?: string;
  accountType: string;
  role: TeamRequestRole;
}

export interface TeamRequest {
  id: number;
  projectId: number;
  userId: number;
  role: TeamRequestRole;
  purpose: TeamRequestPurpose;
  initiatedBy: TeamRequestInitiator;
  status: TeamRequestStatus;
  message: string | null;
  createdAt: string;
  resolvedAt: string | null;
  user: { id: number; name: string; email?: string; accountType: string };
}

export interface ReceivedTeamRequest extends TeamRequest {
  project: { id: number; name: string };
}
