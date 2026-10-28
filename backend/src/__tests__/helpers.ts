import request from "supertest";
import type { AccountType } from "@prisma/client";
import { app } from "../app";
import { prisma } from "../repositories/prisma-client";

let categoryIdCache: number | null = null;
let sdgIdCache: number | null = null;

/** Lazily creates (once per test run) an Sdg row — `Sdg.id` has no default
 * (it mirrors the UN's 1-17 numbering), and the test database starts empty
 * (see global-setup.ts), so anything needing a valid `sdgId` (e.g.
 * `POST /challenges`) must create one first, the same way `ensureCategory`
 * does for `Category`. */
export async function ensureSdg(): Promise<number> {
  if (sdgIdCache !== null) return sdgIdCache;
  const sdg = await prisma.sdg.create({
    data: { id: 1, name: "ODS de prueba", colorHex: "#654321" },
  });
  sdgIdCache = sdg.id;
  return sdg.id;
}

/** Lazily creates (once per test run) a Category row to satisfy the
 * ProjectCategory FK — the test database has no seed data. */
export async function ensureCategory(): Promise<number> {
  if (categoryIdCache !== null) return categoryIdCache;
  const category = await prisma.category.create({
    data: { name: `Categoría de prueba ${Date.now()}`, colorHex: "#123456", icon: "flask" },
  });
  categoryIdCache = category.id;
  return category.id;
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1_000_000)}@test.praxis`;
}

export interface RegisteredUser {
  token: string;
  user: { id: number; email: string; name: string; accountType: AccountType };
}

export async function registerUser(
  accountType: AccountType = "STUDENT",
  namePrefix = "Test User",
): Promise<RegisteredUser> {
  const email = uniqueEmail(namePrefix.replace(/\s+/g, "").toLowerCase());
  const res = await request(app).post("/api/auth/register").send({
    email,
    password: "password123",
    name: namePrefix,
    accountType,
  });
  if (res.status !== 201) {
    throw new Error(`Failed to register user: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token as string, user: res.body.user };
}

export async function createProjectFor(
  token: string,
  overrides: Record<string, unknown> = {},
): Promise<{ status: number; body: any }> {
  const categoryId = await ensureCategory();
  const res = await request(app)
    .post("/api/projects")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: `Proyecto ${Date.now()}-${Math.floor(Math.random() * 100_000)}`,
      description: "Descripción de prueba",
      problemStatement: "Problema de prueba",
      objectives: "Objetivos de prueba",
      categoryIds: [categoryId],
      ...overrides,
    });
  return { status: res.status, body: res.body };
}

/**
 * Creates a project with `visibility: "PUBLIC"` (the old publish step is
 * gone: there's no status to transition through anymore). Kept under its
 * original name since most tests only care that the project is publicly
 * visible, not about any lifecycle step.
 */
export async function createPublishedProject(
  token: string,
  overrides: Record<string, unknown> = {},
) {
  const created = await createProjectFor(token, { visibility: "PUBLIC", ...overrides });
  if (created.status !== 201) {
    throw new Error(`Failed to create project: ${created.status} ${JSON.stringify(created.body)}`);
  }
  return created.body;
}

/**
 * Creates a project inviting `evaluatorUserId` as an EVALUATOR (plan
 * decision #6 / WU-05: teacherId/organizationId are only ever filled by
 * accepting that invite), then immediately accepts it as that evaluator so
 * callers get back a project with the evaluator link already live.
 */
export async function createProjectWithAcceptedEvaluator(
  ownerToken: string,
  evaluatorToken: string,
  evaluatorUserId: number,
  overrides: Record<string, unknown> = {},
): Promise<{ id: number; visibility: string; archived: boolean }> {
  const created = await createProjectFor(ownerToken, {
    evaluatorInviteIds: [evaluatorUserId],
    ...overrides,
  });
  if (created.status !== 201) {
    throw new Error(`Failed to create project: ${created.status} ${JSON.stringify(created.body)}`);
  }

  const invites = await request(app)
    .get("/api/team-invites/received")
    .set("Authorization", `Bearer ${evaluatorToken}`);
  const invite = (invites.body as Array<{ id: number; projectId: number }>).find(
    (i) => i.projectId === created.body.id,
  );
  if (!invite) {
    throw new Error("Evaluator invite not found among the evaluator's received invites");
  }

  const accepted = await request(app)
    .patch(`/api/team-requests/${invite.id}`)
    .set("Authorization", `Bearer ${evaluatorToken}`)
    .send({ status: "ACCEPTED" });
  if (accepted.status !== 200) {
    throw new Error(
      `Failed to accept evaluator invite: ${accepted.status} ${JSON.stringify(accepted.body)}`,
    );
  }

  return created.body;
}

export { app, request, prisma };
