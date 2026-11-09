export type ClassGroupResourceType = "FILE" | "LINK";

export interface ClassGroupTeacherRef {
  id: number;
  name: string;
  accountType: string;
  // Only present on the owning teacher's own `GET /class-groups/:id`
  // request (mirrors ProjectPersonRef.email's WU-13 convention).
  email?: string;
}

export interface ClassGroupResource {
  id: number;
  classGroupId: number;
  creatorId: number;
  type: ClassGroupResourceType;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  label: string;
  description: string | null;
  createdAt: string;
  creator: { id: number; name: string };
}

export interface ClassGroupProjectRef {
  id: number;
  name: string;
  visibility: "PUBLIC" | "PRIVATE";
  archived: boolean;
}

export interface ClassGroupMemberRow {
  classGroupId: number;
  userId: number;
  joinedAt: string;
  user: { id: number; name: string; email: string; accountType: string };
}

export interface ClassGroupCounts {
  resources: number;
  members: number;
  projects: number;
}

export interface ClassGroupViewer {
  isOwner: boolean;
  isMember: boolean;
  canJoin: boolean;
}

export interface ClassGroup {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  teacherId: number;
  teacher: ClassGroupTeacherRef;
  // Absent (not an empty array) when the viewer's tier doesn't include
  // them — preview tier, or an anonymous/outsider request.
  resources?: ClassGroupResource[];
  projects?: ClassGroupProjectRef[];
  members?: ClassGroupMemberRow[];
  _count?: ClassGroupCounts;
  // Absent for an anonymous requester.
  viewer?: ClassGroupViewer;
  bannerUrl?: string | null;
}

export interface CreateClassGroupPayload {
  name: string;
  description: string;
}

export type UpdateClassGroupPayload = Partial<CreateClassGroupPayload> & { bannerUrl?: string | null };

export interface CreateClassGroupResourcePayload {
  type: ClassGroupResourceType;
  url: string;
  label: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}
