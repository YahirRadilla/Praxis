import type { AccountType } from "../types/auth";

/**
 * Account types allowed to create Retos (challenges).
 *
 * Backlog (PLAN_REDISENO_CICLO_VIDA_EVALUACION.md, sección 9): algún día
 * cuentas TEACHER también podrán publicar retos. Cuando eso pase, amplía
 * esta lista (y el check equivalente en backend/src/services/challenge.service.ts)
 * en una sola línea.
 */
export const CHALLENGE_CREATOR_TYPES: AccountType[] = ["ORGANIZATION"];
