import path from "path";
import dotenv from "dotenv";

// Loaded once per test worker, before any test file's imports run. Points
// the app (and the Prisma client it creates on import) at the dedicated
// praxis_test database instead of the real dev database.
dotenv.config({ path: path.resolve(__dirname, "../../.env.test"), override: true });

const databaseUrl = process.env.DATABASE_URL ?? "";
if (!databaseUrl.includes("praxis_test")) {
  throw new Error(
    `Refusing to run tests: DATABASE_URL does not point to praxis_test (got: ${databaseUrl}).`,
  );
}
