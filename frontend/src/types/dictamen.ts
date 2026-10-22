export type DictamenVerdict = "APPROVED" | "CHANGES_REQUESTED";

export interface Dictamen {
  id: number;
  verdict: DictamenVerdict;
  comment: string;
  createdAt: string;
  evaluator: { id: number; name: string; email: string; accountType: string };
}
