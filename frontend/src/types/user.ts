import type { AccountType } from "./auth";

// Shape returned by GET /api/users/:id — the public view of a user profile.
// Never includes `email` (plan §2: email stays insider-only, same rule as
// `ProjectPersonRef`).
export interface PublicUserProfile {
  id: number;
  name: string;
  accountType: AccountType;
  academicProgram: string | null;
  semester: number | null;
  skills: string[];
  interests: string[];
  cvUrl: string | null;
  verified: boolean;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  followedByMe: boolean;
}
