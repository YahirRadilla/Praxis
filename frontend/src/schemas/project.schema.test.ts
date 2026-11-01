import { describe, expect, it } from "vitest";
import { createProjectFormSchema, updateProjectFormSchema } from "./project.schema";

const BASE_VALID = {
  name: "Proyecto X",
  description: "Descripción",
  problemStatement: "Problemática",
  objectives: "Objetivos",
  sdgIds: [],
  categoryIds: [1],
  visibility: "PRIVATE" as const,
};

describe("createProjectFormSchema", () => {
  it.each(["name", "description", "problemStatement", "objectives"])(
    "rejects an empty %s",
    (field) => {
      const result = createProjectFormSchema.safeParse({ ...BASE_VALID, [field]: "" });
      expect(result.success).toBe(false);
    },
  );

  it("requires at least one category", () => {
    const result = createProjectFormSchema.safeParse({ ...BASE_VALID, categoryIds: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecciona al menos una categoría");
    }
  });

  it("rejects more than 3 categories", () => {
    const result = createProjectFormSchema.safeParse({ ...BASE_VALID, categoryIds: [1, 2, 3, 4] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Máximo 3 categorías");
    }
  });

  it("accepts a fully valid payload with optional challenge/classGroup omitted", () => {
    const result = createProjectFormSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
  });

  it("accepts null challengeId/classGroupId (unlinked)", () => {
    const result = createProjectFormSchema.safeParse({
      ...BASE_VALID,
      challengeId: null,
      classGroupId: null,
    });
    expect(result.success).toBe(true);
  });
});

describe("updateProjectFormSchema", () => {
  it("has no challengeId/classGroupId fields (evaluator/reto links aren't editable here)", () => {
    const result = updateProjectFormSchema.safeParse(BASE_VALID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("challengeId");
      expect(result.data).not.toHaveProperty("classGroupId");
    }
  });

  it("still enforces the categoryIds 1-3 bound", () => {
    const result = updateProjectFormSchema.safeParse({ ...BASE_VALID, categoryIds: [] });
    expect(result.success).toBe(false);
  });
});
