export type AccountType = "STUDENT" | "TEACHER" | "ORGANIZATION" | "INDEPENDENT";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  accountType: AccountType;
  skills: string[];
  interests: string[];
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
  academicProgram: string | null;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  accountType: AccountType;
}
