import { describe, expect, it } from "vitest";
import {
  app,
  createPublishedProject,
  createProjectWithAcceptedEvaluator,
  registerUser,
  request,
} from "./helpers";

/**
 * WU-10: the activity board (and labels) are insider-only — owner, accepted
 * MEMBER, or confirmed evaluator — even on a PUBLIC project (plan decision
 * #10, replacing decisions 19/20 of the Kanban plan). A confirmed evaluator
 * can comment without being a member (decision #8), but nothing else.
 */

async function addAcceptedMember(ownerToken: string, projectId: number) {
  const member = await registerUser("STUDENT", "Board Member");
  const joinRes = await request(app)
    .post(`/api/projects/${projectId}/team-requests`)
    .set("Authorization", `Bearer ${member.token}`)
    .send({ message: "Quiero sumarme" });
  await request(app)
    .patch(`/api/team-requests/${joinRes.body.id}`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ status: "ACCEPTED" });
  return member;
}

describe("activity board restricted to team + evaluator (WU-10)", () => {
  it("returns 404 on the board list and activity detail for an anonymous visitor to a PUBLIC project", async () => {
    const owner = await registerUser("STUDENT", "Board Owner Anon");
    const project = await createPublishedProject(owner.token);

    const createRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Tarea", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(createRes.status).toBe(201);
    const activityId = createRes.body.id;

    const listRes = await request(app).get(`/api/projects/${project.id}/activities`);
    expect(listRes.status).toBe(404);

    const detailRes = await request(app).get(
      `/api/projects/${project.id}/activities/${activityId}`,
    );
    expect(detailRes.status).toBe(404);

    const labelsRes = await request(app).get(`/api/projects/${project.id}/labels`);
    expect(labelsRes.status).toBe(404);
  });

  it("returns 404 on the board list and activity detail for an authenticated outsider to a PUBLIC project", async () => {
    const owner = await registerUser("STUDENT", "Board Owner Outsider");
    const outsider = await registerUser("STUDENT", "Board Outsider");
    const project = await createPublishedProject(owner.token);

    const createRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Tarea", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    const activityId = createRes.body.id;

    const listRes = await request(app)
      .get(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(listRes.status).toBe(404);

    const detailRes = await request(app)
      .get(`/api/projects/${project.id}/activities/${activityId}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(detailRes.status).toBe(404);
  });

  it("lets a confirmed evaluator read the board and comment, but not move/edit a card", async () => {
    const owner = await registerUser("STUDENT", "Board Owner Evaluator");
    const evaluator = await registerUser("TEACHER", "Board Evaluator");
    const project = await createProjectWithAcceptedEvaluator(
      owner.token,
      evaluator.token,
      evaluator.user.id,
    );

    const createRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Tarea evaluador", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(createRes.status).toBe(201);
    const activityId = createRes.body.id;

    const listRes = await request(app)
      .get(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${evaluator.token}`);
    expect(listRes.status).toBe(200);

    const detailRes = await request(app)
      .get(`/api/projects/${project.id}/activities/${activityId}`)
      .set("Authorization", `Bearer ${evaluator.token}`);
    expect(detailRes.status).toBe(200);

    const commentRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${activityId}/comments`)
      .set("Authorization", `Bearer ${evaluator.token}`)
      .send({ text: "Buen avance." });
    expect(commentRes.status).toBe(201);

    const moveRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${activityId}/move`)
      .set("Authorization", `Bearer ${evaluator.token}`)
      .send({ status: "IN_PROGRESS", position: 0 });
    expect(moveRes.status).toBe(403);

    const editRes = await request(app)
      .patch(`/api/projects/${project.id}/activities/${activityId}`)
      .set("Authorization", `Bearer ${evaluator.token}`)
      .send({ title: "No debería poder" });
    expect(editRes.status).toBe(403);

    const checklistRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${activityId}/checklist-items`)
      .set("Authorization", `Bearer ${evaluator.token}`)
      .send({ text: "No debería poder" });
    expect(checklistRes.status).toBe(403);
  });

  it("keeps full board access for an accepted member", async () => {
    const owner = await registerUser("STUDENT", "Board Owner Member");
    const project = await createPublishedProject(owner.token);
    const member = await addAcceptedMember(owner.token, project.id);

    const createRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ title: "Tarea del equipo", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(createRes.status).toBe(201);
    const activityId = createRes.body.id;

    const listRes = await request(app)
      .get(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(listRes.status).toBe(200);

    const moveRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${activityId}/move`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ status: "IN_PROGRESS", position: 0 });
    expect(moveRes.status).toBe(200);

    const commentRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${activityId}/comments`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ text: "Comentario de integrante." });
    expect(commentRes.status).toBe(201);
  });

  it("still lets an insider read the board once the project is archived, but blocks writes", async () => {
    const owner = await registerUser("STUDENT", "Board Owner Archived");
    const project = await createPublishedProject(owner.token);
    const member = await addAcceptedMember(owner.token, project.id);

    const createRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Tarea previa", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    const activityId = createRes.body.id;

    const archiveRes = await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(archiveRes.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(listRes.status).toBe(200);

    const commentRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${activityId}/comments`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ text: "No debería poder: archivado." });
    expect(commentRes.status).toBe(409);
  });
});
