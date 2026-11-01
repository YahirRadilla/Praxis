import type { AccountType } from "../types/auth";

/**
 * Account types allowed to create Retos (challenges). Mirrors the equivalent
 * check in backend/src/services/challenge.service.ts.
 */
export const CHALLENGE_CREATOR_TYPES: AccountType[] = ["ORGANIZATION", "TEACHER"];
