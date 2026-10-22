import type { AccountType } from "@prisma/client";
import {
  createChallenge as createChallengeRepo,
  findChallengeById,
  listChallenges as listChallengesRepo,
  type CreateChallengeData,
  type ListChallengesFilters,
} from "../repositories/challenge.repository";
import { HttpError } from "../types/http-error";
import type { CreateChallengeInput } from "../schemas/challenge.schema";

export async function createChallenge(
  organizationId: number,
  actingUserAccountType: AccountType,
  input: CreateChallengeInput,
) {
  if (actingUserAccountType !== "ORGANIZATION") {
    throw new HttpError(403, "Solo una organización puede publicar un reto.");
  }

  const data: CreateChallengeData = { organizationId, ...input };
  return createChallengeRepo(data);
}

export async function listChallenges(filters: ListChallengesFilters) {
  return listChallengesRepo(filters);
}

export async function getChallenge(id: number) {
  const challenge = await findChallengeById(id);
  if (!challenge) {
    throw new HttpError(404, "Reto no encontrado.");
  }
  return challenge;
}
