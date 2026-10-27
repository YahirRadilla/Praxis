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

export interface Category {
  id: number;
  name: string;
  colorHex: string;
  icon: string;
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
  categories: { projectId: number; categoryId: number; category: Category }[];
  challenge: { id: number; title: string } | null;
}

export interface CreateProjectPayload {
  name: string;
  description: string;
  problemStatement: string;
  objectives: string;
  sdgIds: number[];
  categoryIds: number[];
  teacherId?: number;
  organizationId?: number;
  visibility?: ProjectVisibility;
  challengeId?: number;
}

export interface SearchProjectsParams {
  q?: string;
  sdgIds?: number[];
  categoryIds?: number[];
}
