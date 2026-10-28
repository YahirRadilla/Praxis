import { describe, expect, it } from "vitest";
import { app, createPublishedProject, prisma, registerUser, request } from "./helpers";

async function postToFeed(token: string, projectId: number, text: string) {
  const res = await request(app)
    .post(`/api/projects/${projectId}/progress-updates`)
    .set("Authorization", `Bearer ${token}`)
    .send({ text, postedToFeed: true });
  if (res.status !== 201) {
    throw new Error(`Failed to post progress update: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

describe("public feed", () => {
  it("does not include progress updates from a PRIVATE project", async () => {
    const owner = await registerUser("STUDENT", "Owner Feed Private");
    const publicProject = await createPublishedProject(owner.token, {
      name: `Feed Public ${Date.now()}`,
    });
    const privateProject = await createPublishedProject(owner.token, {
      name: `Feed Private ${Date.now()}`,
      visibility: "PRIVATE",
    });

    const publicUpdate = await postToFeed(owner.token, publicProject.id, `Avance público ${Date.now()}`);
    const privateUpdate = await postToFeed(owner.token, privateProject.id, `Avance privado ${Date.now()}`);

    const feedRes = await request(app).get("/api/feed");
    expect(feedRes.status).toBe(200);
    const feedIds = feedRes.body.map((entry: any) => entry.id);
    expect(feedIds).toContain(publicUpdate.id);
    expect(feedIds).not.toContain(privateUpdate.id);
  });

  it("narrows results to projects with the given categoryId", async () => {
    const owner = await registerUser("STUDENT", "Owner Feed Category");
    const otherCategory = await prisma.category.create({
      data: { name: `Otra categoría ${Date.now()}`, colorHex: "#654321", icon: "star" },
    });

    const matchingProject = await createPublishedProject(owner.token, {
      name: `Feed Match ${Date.now()}`,
    });
    const otherProject = await createPublishedProject(owner.token, {
      name: `Feed Other ${Date.now()}`,
      categoryIds: [otherCategory.id],
    });

    const matchingUpdate = await postToFeed(owner.token, matchingProject.id, `Avance match ${Date.now()}`);
    const otherUpdate = await postToFeed(owner.token, otherProject.id, `Avance other ${Date.now()}`);

    const matchingCategoryId = matchingProject.categories[0].category.id;

    const filteredRes = await request(app).get(`/api/feed?categoryId=${matchingCategoryId}`);
    expect(filteredRes.status).toBe(200);
    const filteredIds = filteredRes.body.map((entry: any) => entry.id);
    expect(filteredIds).toContain(matchingUpdate.id);
    expect(filteredIds).not.toContain(otherUpdate.id);
  });
});
