import { describe, expect, it } from "vitest";
import {
  app,
  createProjectFor,
  ensureCategory,
  ensureSdg,
  prisma,
  registerUser,
  request,
} from "./helpers";

async function ensureSecondCategory(): Promise<number> {
  const category = await prisma.category.create({
    data: { name: `Categoría extra ${Date.now()}`, colorHex: "#abcdef", icon: "star" },
  });
  return category.id;
}

describe("challenge creation: account types", () => {
  it("lets a TEACHER create a challenge (previously 403)", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Create Challenge");
    const sdgId = await ensureSdg();

    const res = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: "Reto docente",
        description: "Un reto publicado por un docente.",
        sdgIds: [sdgId],
      });
    expect(res.status).toBe(201);
    expect(res.body.organization.id).toBe(teacher.user.id);
  });

  it("still lets an ORGANIZATION create a challenge", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Create Challenge");
    const sdgId = await ensureSdg();

    const res = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: "Reto de organización",
        description: "Un reto publicado por una organización.",
        sdgIds: [sdgId],
      });
    expect(res.status).toBe(201);
  });

  it("still rejects challenge creation from a STUDENT account", async () => {
    const student = await registerUser("STUDENT", "Student Create Challenge");
    const sdgId = await ensureSdg();

    const res = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${student.token}`)
      .send({
        title: "Reto de estudiante",
        description: "No debería poder publicarse.",
        sdgIds: [sdgId],
      });
    expect(res.status).toBe(403);
  });
});

describe("challenge creation: sdgIds / categoryIds", () => {
  it("creates a challenge with only categoryIds (no sdgIds)", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Challenge CategoryOnly");
    const categoryId = await ensureCategory();

    const res = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: "Reto solo con categoría",
        description: "Sin ODS seleccionados.",
        categoryIds: [categoryId],
      });
    expect(res.status).toBe(201);
    expect(res.body.sdgs).toEqual([]);
    expect(res.body.categories).toHaveLength(1);
    expect(res.body.categories[0].category.id).toBe(categoryId);
  });

  it("creates a challenge with only sdgIds (no categoryIds)", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Challenge SdgOnly");
    const sdgId = await ensureSdg();

    const res = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: "Reto solo con ODS",
        description: "Sin categorías seleccionadas.",
        sdgIds: [sdgId],
      });
    expect(res.status).toBe(201);
    expect(res.body.categories).toEqual([]);
    expect(res.body.sdgs).toHaveLength(1);
  });

  it("rejects a challenge with neither sdgIds nor categoryIds", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Challenge Neither");

    const res = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: "Reto incompleto",
        description: "No debería poder crearse.",
      });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/challenges: q and categoryIds filters", () => {
  it("filters by q against title/description, case-insensitively", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Challenge Search");
    const sdgId = await ensureSdg();
    const unique = Date.now();

    await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: `Reciclaje institucional ${unique}`,
        description: "Descripción genérica.",
        sdgIds: [sdgId],
      });
    await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: `Movilidad sustentable ${unique}`,
        description: "Otra descripción genérica.",
        sdgIds: [sdgId],
      });

    const res = await request(app).get("/api/challenges").query({ q: "reciclaje" });
    expect(res.status).toBe(200);
    const titles = res.body.map((c: any) => c.title as string);
    expect(titles.some((t: string) => t.toLowerCase().includes("reciclaje"))).toBe(true);
    expect(titles.some((t: string) => t.includes(`Movilidad sustentable ${unique}`))).toBe(false);
  });

  it("filters by categoryIds", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Challenge CategoryFilter");
    const categoryA = await ensureCategory();
    const categoryB = await ensureSecondCategory();

    const withA = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: `Reto categoría A ${Date.now()}`,
        description: "Usa categoría A.",
        categoryIds: [categoryA],
      });
    const withB = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({
        title: `Reto categoría B ${Date.now()}`,
        description: "Usa categoría B.",
        categoryIds: [categoryB],
      });

    const res = await request(app)
      .get("/api/challenges")
      .query({ categoryIds: String(categoryB) });
    expect(res.status).toBe(200);
    const ids = res.body.map((c: any) => c.id);
    expect(ids).toContain(withB.body.id);
    expect(ids).not.toContain(withA.body.id);
  });
});

describe("Bug fix: challenges' public endpoints don't leak private project fields", () => {
  it("GET /api/challenges/:id excludes a linked PRIVATE project entirely, and only exposes minimal fields for a PUBLIC one", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Challenge Leak");
    const owner = await registerUser("STUDENT", "Owner Challenge Leak");
    const sdgId = await ensureSdg();

    const challenge = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: `Reto filtración ${Date.now()}`,
        description: "Reto usado para probar que no se filtra información privada.",
        sdgIds: [sdgId],
      });
    expect(challenge.status).toBe(201);

    const privateProject = await createProjectFor(owner.token, {
      challengeId: challenge.body.id,
      visibility: "PRIVATE",
      description: "Descripción privada que no debería salir en el reto público.",
      problemStatement: "Problema privado confidencial.",
      objectives: "Objetivos privados confidenciales.",
    });
    expect(privateProject.status).toBe(201);

    const publicProject = await createProjectFor(owner.token, {
      challengeId: challenge.body.id,
      visibility: "PUBLIC",
    });
    expect(publicProject.status).toBe(201);

    const res = await request(app).get(`/api/challenges/${challenge.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([
      {
        id: publicProject.body.id,
        name: publicProject.body.name,
        visibility: "PUBLIC",
        archived: false,
        bannerUrl: null,
      },
    ]);
  });

  it("GET /api/challenges (list) also excludes PRIVATE projects and only exposes minimal safe fields", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Challenge Leak List");
    const owner = await registerUser("STUDENT", "Owner Challenge Leak List");
    const sdgId = await ensureSdg();

    const challenge = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: `Reto filtración lista ${Date.now()}`,
        description: "Otro reto para probar la lista pública.",
        sdgIds: [sdgId],
      });
    expect(challenge.status).toBe(201);

    const privateProject = await createProjectFor(owner.token, {
      challengeId: challenge.body.id,
      visibility: "PRIVATE",
    });
    expect(privateProject.status).toBe(201);

    const publicProject = await createProjectFor(owner.token, {
      challengeId: challenge.body.id,
      visibility: "PUBLIC",
    });
    expect(publicProject.status).toBe(201);

    const res = await request(app).get("/api/challenges").query({ q: "filtración lista" });
    expect(res.status).toBe(200);
    const found = res.body.find((c: any) => c.id === challenge.body.id);
    expect(found.projects).toEqual([
      {
        id: publicProject.body.id,
        name: publicProject.body.name,
        visibility: "PUBLIC",
        archived: false,
        bannerUrl: null,
      },
    ]);
  });
});

describe("challenge bannerUrl: PATCH /api/challenges/:id", () => {
  it("lets the publisher (organizationId match) PATCH bannerUrl", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Banner Patch");
    const sdgId = await ensureSdg();
    const challenge = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: `Reto banner ${Date.now()}`,
        description: "Reto para probar el banner.",
        sdgIds: [sdgId],
      });
    expect(challenge.status).toBe(201);

    const res = await request(app)
      .patch(`/api/challenges/${challenge.body.id}`)
      .set("Authorization", `Bearer ${organization.token}`)
      .send({ bannerUrl: "https://example.com/banner.png" });
    expect(res.status).toBe(200);
    expect(res.body.bannerUrl).toBe("https://example.com/banner.png");
  });

  it("rejects a PATCH from a different authenticated user with 403", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Banner Other");
    const other = await registerUser("ORGANIZATION", "Org Banner Intruder");
    const sdgId = await ensureSdg();
    const challenge = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: `Reto banner ajeno ${Date.now()}`,
        description: "No debería poder modificarse por otro.",
        sdgIds: [sdgId],
      });
    expect(challenge.status).toBe(201);

    const res = await request(app)
      .patch(`/api/challenges/${challenge.body.id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ bannerUrl: "https://example.com/banner.png" });
    expect(res.status).toBe(403);
  });

  it("404s a PATCH on a nonexistent challenge id", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Banner Missing");

    const res = await request(app)
      .patch("/api/challenges/999999")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({ bannerUrl: "https://example.com/banner.png" });
    expect(res.status).toBe(404);
  });

  it("rejects a PATCH with an extra unknown key, because the schema is strict", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Banner Strict");
    const sdgId = await ensureSdg();
    const challenge = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: `Reto banner estricto ${Date.now()}`,
        description: "Reto para probar la validación estricta.",
        sdgIds: [sdgId],
      });
    expect(challenge.status).toBe(201);

    const res = await request(app)
      .patch(`/api/challenges/${challenge.body.id}`)
      .set("Authorization", `Bearer ${organization.token}`)
      .send({ bannerUrl: "https://example.com/banner.png", title: "Intento de cambiar otra cosa" });
    expect(res.status).toBe(400);
  });

  it("requires authentication: no token returns 401", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Banner Auth");
    const sdgId = await ensureSdg();
    const challenge = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: `Reto banner sin auth ${Date.now()}`,
        description: "Reto para probar que requiere autenticación.",
        sdgIds: [sdgId],
      });
    expect(challenge.status).toBe(201);

    const res = await request(app)
      .patch(`/api/challenges/${challenge.body.id}`)
      .send({ bannerUrl: "https://example.com/banner.png" });
    expect(res.status).toBe(401);
  });

  it("GET /api/challenges (list) includes bannerUrl in each item's shape", async () => {
    const organization = await registerUser("ORGANIZATION", "Org Banner List");
    const sdgId = await ensureSdg();
    const challenge = await request(app)
      .post("/api/challenges")
      .set("Authorization", `Bearer ${organization.token}`)
      .send({
        title: `Reto banner lista ${Date.now()}`,
        description: "Reto para probar que la lista incluye bannerUrl.",
        sdgIds: [sdgId],
      });
    expect(challenge.status).toBe(201);
    expect(challenge.body.bannerUrl).toBeNull();

    const res = await request(app).get("/api/challenges").query({ q: "banner lista" });
    expect(res.status).toBe(200);
    const found = res.body.find((c: any) => c.id === challenge.body.id);
    expect(found).toHaveProperty("bannerUrl");
    expect(found.bannerUrl).toBeNull();
  });
});
