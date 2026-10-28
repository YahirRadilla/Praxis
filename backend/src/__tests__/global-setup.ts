import path from "path";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

/**
 * Runs once before the whole test run starts. Loads the dedicated test
 * database config and wipes every table so each run starts from a clean
 * slate, regardless of leftovers from a previous run.
 *
 * Safety: refuses to run unless DATABASE_URL clearly points at the
 * `praxis_test` database, so a misconfigured env can never truncate the
 * real `praxis` dev database.
 */
export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, "../../.env.test"), override: true });

  const databaseUrl = process.env.DATABASE_URL ?? "";
  if (!databaseUrl.includes("praxis_test")) {
    throw new Error(
      `Refusing to run tests: DATABASE_URL does not point to praxis_test (got: ${databaseUrl}).`,
    );
  }

  const prisma = new PrismaClient();
  try {
    await prisma.$executeRawUnsafe(`
      TRUNCATE TABLE
        "activity_labels", "project_labels", "activity_comments", "activity_attachments",
        "checklist_items", "checklist_sections", "activity_events", "activity_assignees",
        "evidence", "progress_updates", "dictamenes", "saved_projects", "activities",
        "team_requests", "project_categories", "project_sdgs", "challenge_sdgs",
        "projects", "challenges", "categories", "sdgs", "users"
      RESTART IDENTITY CASCADE
    `);
  } finally {
    await prisma.$disconnect();
  }
}
