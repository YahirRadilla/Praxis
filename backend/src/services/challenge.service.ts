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

// Retos are public, so the publisher's contact email only makes sense to
// expose when it's an ORGANIZATION's institutional address (plan decision
// #11's existing exception). Now that TEACHER accounts can publish too,
// their personal email must stay hidden the same way it's hidden everywhere
// else in the app for non-insiders.
function hideNonOrganizationEmail<T extends { organization: { accountType: AccountType; email: string | null } }>(
  challenge: T,
): T {
  if (challenge.organization.accountType === "ORGANIZATION") return challenge;
  return { ...challenge, organization: { ...challenge.organization, email: null } };
}

export async function createChallenge(
  organizationId: number,
  actingUserAccountType: AccountType,
  input: CreateChallengeInput,
) {
  if (!["ORGANIZATION", "TEACHER"].includes(actingUserAccountType)) {
    throw new HttpError(403, "Solo una organización o un docente pueden publicar un reto.");
  }

  const data: CreateChallengeData = { organizationId, ...input };
  const challenge = await createChallengeRepo(data);
  return hideNonOrganizationEmail(challenge);
}

export async function listChallenges(filters: ListChallengesFilters) {
  const challenges = await listChallengesRepo(filters);
  return challenges.map(hideNonOrganizationEmail);
}

export async function getChallenge(id: number) {
  const challenge = await findChallengeById(id);
  if (!challenge) {
    throw new HttpError(404, "Reto no encontrado.");
  }
  return hideNonOrganizationEmail(challenge);
}
