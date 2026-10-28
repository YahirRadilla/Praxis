import type { Project, ProjectPersonRef, Sdg } from "./project";

export interface Challenge {
  id: number;
  title: string;
  description: string;
  deadline: string | null;
  createdAt: string;
  organizationId: number;
  // Explicit exception to WU-13 (plan decision #11): a Reto's organization
  // email stays public contact info, so it's always present here, unlike
  // the general `ProjectPersonRef.email`.
  organization: ProjectPersonRef & { email: string };
  sdgs: { challengeId: number; sdgId: number; sdg: Sdg }[];
  projects: Project[];
}

export interface CreateChallengePayload {
  title: string;
  description: string;
  deadline?: string;
  sdgIds: number[];
}

export interface ListChallengesParams {
  sdgIds?: number[];
}
