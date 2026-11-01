import { describe, expect, it } from "vitest";
import { createChallengeFormSchema } from "./challenge.schema";

const BASE = { title: "Reto X", description: "Descripción del reto" };

describe("createChallengeFormSchema", () => {
  it("rejects when neither sdgIds nor categoryIds is set", () => {
    const result = createChallengeFormSchema.safeParse(BASE);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecciona al menos un ODS o una categoría");
    }
  });

  it("rejects when both arrays are present but empty", () => {
    const result = createChallengeFormSchema.safeParse({ ...BASE, sdgIds: [], categoryIds: [] });
    expect(result.success).toBe(false);
  });

  it("accepts with only sdgIds populated", () => {
    const result = createChallengeFormSchema.safeParse({ ...BASE, sdgIds: [1], categoryIds: [] });
    expect(result.success).toBe(true);
  });

  it("accepts with only categoryIds populated", () => {
    const result = createChallengeFormSchema.safeParse({ ...BASE, sdgIds: [], categoryIds: [2] });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title or description", () => {
    const result = createChallengeFormSchema.safeParse({ ...BASE, title: "", sdgIds: [1] });
    expect(result.success).toBe(false);
  });
});
