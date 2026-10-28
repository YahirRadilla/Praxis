export type DictamenVerdict = "APPROVED" | "CHANGES_REQUESTED";

export interface Dictamen {
  id: number;
  verdict: DictamenVerdict;
  comment: string;
  createdAt: string;
  // WU-13 (plan decision #11): present because `listDictamenes` is already
  // insider-only (WU-12) — kept optional for consistency with the other
  // person-shaped types that outsiders can reach.
  evaluator: { id: number; name: string; email?: string; accountType: string };
}
