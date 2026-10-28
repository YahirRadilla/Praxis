import { describe, expect, it } from "vitest";
import { app, createPublishedProject, registerUser, request } from "./helpers";

describe("progress updates", () => {
  it("rejects an activityId that belongs to a different project with 400", async () => {
    const owner = await registerUser("STUDENT", "Owner Progress");
    const projectA = await createPublishedProject(owner.token);
    const projectB = await createPublishedProject(owner.token);

    const activityInB = await request(app)
      .post(`/api/projects/${projectB.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Actividad de B", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(activityInB.status).toBe(201);

    const crossRes = await request(app)
      .post(`/api/projects/${projectA.id}/progress-updates`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ text: "Avance", activityId: activityInB.body.id });
    expect(crossRes.status).toBe(400);

    const activityInA = await request(app)
      .post(`/api/projects/${projectA.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Actividad de A", dueDate: new Date(Date.now() + 86_400_000).toISOString() });

    const validRes = await request(app)
      .post(`/api/projects/${projectA.id}/progress-updates`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ text: "Avance válido", activityId: activityInA.body.id });
    expect(validRes.status).toBe(201);
  });
});
