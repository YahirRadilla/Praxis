import { describe, expect, it } from "vitest";
import { loginFormSchema, registerFormSchema } from "./auth.schema";

describe("loginFormSchema", () => {
  it("rejects an empty email and password", () => {
    const result = loginFormSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain("email");
      expect(paths).toContain("password");
    }
  });

  it("rejects a malformed email", () => {
    const result = loginFormSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email/password pair", () => {
    const result = loginFormSchema.safeParse({ email: "a@uabcs.mx", password: "secret" });
    expect(result.success).toBe(true);
  });
});

describe("registerFormSchema", () => {
  it("rejects a password shorter than 8 characters", () => {
    const result = registerFormSchema.safeParse({
      name: "Ana",
      email: "ana@uabcs.mx",
      password: "short1",
      accountType: "STUDENT",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["password"]);
    }
  });

  it("rejects an accountType outside the four allowed values", () => {
    const result = registerFormSchema.safeParse({
      name: "Ana",
      email: "ana@uabcs.mx",
      password: "password123",
      accountType: "ADMIN",
    });
    expect(result.success).toBe(false);
  });

  it.each(["STUDENT", "TEACHER", "ORGANIZATION", "INDEPENDENT"] as const)(
    "accepts accountType %s",
    (accountType) => {
      const result = registerFormSchema.safeParse({
        name: "Ana",
        email: "ana@uabcs.mx",
        password: "password123",
        accountType,
      });
      expect(result.success).toBe(true);
    },
  );
});
