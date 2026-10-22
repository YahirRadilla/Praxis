import type { ProjectPersonRef, Sdg } from "./project";

export interface Challenge {
  id: number;
  title: string;
  description: string;
  deadline: string | null;
  createdAt: string;
  organizationId: number;
  organization: ProjectPersonRef;
  sdgs: { challengeId: number; sdgId: number; sdg: Sdg }[];
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
