export type ActivityStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "OVERDUE";
export type EvidenceType = "FILE" | "LINK";

export interface Activity {
  id: number;
  projectId: number;
  ownerId: number;
  title: string;
  description: string | null;
  dueDate: string;
  status: ActivityStatus;
  createdAt: string;
  owner: { id: number; name: string };
}

export interface Evidence {
  id: number;
  progressUpdateId: number;
  type: EvidenceType;
  url: string;
  fileName: string | null;
  createdAt: string;
}

export interface ProgressUpdate {
  id: number;
  projectId: number;
  activityId: number | null;
  authorId: number;
  text: string;
  postedToFeed: boolean;
  validated: boolean;
  createdAt: string;
  author: { id: number; name: string };
  evidence: Evidence[];
  activity?: Activity | null;
}

export interface FeedUpdate extends ProgressUpdate {
  project: {
    id: number;
    name: string;
    sdgs: { projectId: number; sdgId: number; sdg: { id: number; name: string; colorHex: string } }[];
  };
}
