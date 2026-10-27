export type ActivityStatus = "PENDING" | "IN_PROGRESS" | "TO_VALIDATE" | "DONE" | "OVERDUE";
export type ActivityPriority = "BAJA" | "MEDIA" | "ALTA";
export type EvidenceType = "FILE" | "LINK";

export interface ActivityLabel {
  id: number;
  projectId: number;
  name: string;
  colorHex: string;
}

export interface ActivityAssignee {
  activityId: number;
  userId: number;
  assignedAt: string;
  user: { id: number; name: string };
}

export interface ActivityLabelLink {
  activityId: number;
  labelId: number;
  label: ActivityLabel;
}

export interface Activity {
  id: number;
  projectId: number;
  ownerId: number;
  title: string;
  description: string | null;
  dueDate: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  position: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: number; name: string };
  assignees: ActivityAssignee[];
  labels: ActivityLabelLink[];
  _count: { comments: number; attachments: number };
  checklistItems: { done: boolean }[];
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
