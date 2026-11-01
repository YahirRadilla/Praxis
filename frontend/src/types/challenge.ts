import type { Category, Project, ProjectPersonRef, Sdg } from "./project";

export interface Challenge {
  id: number;
  title: string;
  description: string;
  deadline: string | null;
  createdAt: string;
  organizationId: number;
  // Explicit exception to WU-13 (plan decision #11): an ORGANIZATION
  // publisher's email stays public contact info. A TEACHER publisher's
  // personal email is hidden the same way as everywhere else, so this is
  // `null` whenever `organization.accountType !== "ORGANIZATION"`.
  organization: ProjectPersonRef & { email: string | null };
  sdgs: { challengeId: number; sdgId: number; sdg: Sdg }[];
  categories: { challengeId: number; categoryId: number; category: Category }[];
  projects: Project[];
}

export interface CreateChallengePayload {
  title: string;
  description: string;
  deadline?: string;
  sdgIds?: number[];
  categoryIds?: number[];
}

export interface ListChallengesParams {
  q?: string;
  sdgIds?: number[];
  categoryIds?: number[];
}
