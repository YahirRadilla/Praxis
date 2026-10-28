export interface ImpactBreakdownRow {
  name: string;
  colorHex: string;
  count: number;
}

export interface ImpactCategoryRow extends ImpactBreakdownRow {
  categoryId: number;
}

export interface ImpactSdgRow extends ImpactBreakdownRow {
  sdgId: number;
}

export interface ChallengesWithProposals {
  total: number;
  withProposals: number;
}

export interface ImpactStats {
  totalPublicProjects: number;
  acceptedTeamRequests: number;
  pctWithProgressUpdates: number;
  pctWithMultipleMembers: number;
  challengesWithProposals: ChallengesWithProposals;
  pctWithSignedEvaluation: number;
  projectsByCategory: ImpactCategoryRow[];
  projectsBySdg: ImpactSdgRow[];
}
