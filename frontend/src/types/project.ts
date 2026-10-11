export type ProjectStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "ARCHIVED";

export type ProjectVisibility = "PUBLIC" | "PRIVATE";

export interface Sdg {
  id: number;
  name: string;
  colorHex: string;
}

export interface ProjectPersonRef {
  id: number;
  name: string;
  email: string;
  accountType: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  problemStatement: string;
  objectives: string;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
  ownerId: number;
  teacherId: number | null;
  organizationId: number | null;
  owner: ProjectPersonRef;
  teacher: ProjectPersonRef | null;
  organization: ProjectPersonRef | null;
  sdgs: { projectId: number; sdgId: number; sdg: Sdg }[];
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  problemStatement: string;
  objectives: string;
  sdgIds: number[];
  teacherId?: number;
  organizationId?: number;
  visibility?: ProjectVisibility;
}

export interface SearchProjectsParams {
  q?: string;
  sdgIds?: number[];
}
