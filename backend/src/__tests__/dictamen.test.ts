import { describe, expect, it } from "vitest";
import {
  app,
  createPublishedProject,
  createProjectWithAcceptedEvaluator,
  registerUser,
  request,
} from "./helpers";

async function addAcceptedMember(ownerToken: string, projectId: number) {
  const member = await registerUser("STUDENT", "Dictamen Member");
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

describe("dictamen as non-gating feedback", () => {
  it("only the project's real evaluator can submit a Dictamen; someone else is rejected", async () => {
    const owner = await registerUser("STUDENT", "Owner Dictamen");
    const teacher = await registerUser("TEACHER", "Teacher Valid");
    const impostor = await registerUser("TEACHER", "Teacher Impostor");

    const created = await createProjectWithAcceptedEvaluator(
      owner.token,
      teacher.token,
      teacher.user.id,
    );
    const projectId = created.id;

    const impostorRes = await request(app)
      .post(`/api/projects/${projectId}/dictamenes`)
      .set("Authorization", `Bearer ${impostor.token}`)
      .send({ verdict: "APPROVED", comment: "No debería poder" });
    expect(impostorRes.status).toBe(403);

    const validRes = await request(app)
      .post(`/api/projects/${projectId}/dictamenes`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ verdict: "APPROVED", comment: "Todo en orden" });
    expect(validRes.status).toBe(201);
  });

  it("a dictamen never changes the project's visibility or archived state, and the evaluator can leave several", async () => {
    const owner = await registerUser("STUDENT", "Owner Verdict");
    const teacher = await registerUser("TEACHER", "Teacher Verdict");

    const created = await createProjectWithAcceptedEvaluator(
      owner.token,
      teacher.token,
      teacher.user.id,
    );
    const projectId = created.id;

    const changesRes = await request(app)
      .post(`/api/projects/${projectId}/dictamenes`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ verdict: "CHANGES_REQUESTED", comment: "Falta algo" });
    expect(changesRes.status).toBe(201);

    const afterChanges = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(afterChanges.body.visibility).toBe(created.visibility);
    expect(afterChanges.body.archived).toBe(false);

    // The same evaluator can leave a second Dictamen without the project
    // going through any cycle or status: feedback is append-only history.
    const approvedRes = await request(app)
      .post(`/api/projects/${projectId}/dictamenes`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ verdict: "APPROVED", comment: "Ahora sí" });
    expect(approvedRes.status).toBe(201);

    const afterApproved = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(afterApproved.body.visibility).toBe(created.visibility);
    expect(afterApproved.body.archived).toBe(false);

    const listRes = await request(app)
      .get(`/api/projects/${projectId}/dictamenes`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(2);
  });

  it("rejects a dictamen on an archived project", async () => {
    const owner = await registerUser("STUDENT", "Owner Dictamen Archived");
    const teacher = await registerUser("TEACHER", "Teacher Archived");

    const created = await createProjectWithAcceptedEvaluator(
      owner.token,
      teacher.token,
      teacher.user.id,
    );
    const projectId = created.id;

    await request(app)
      .post(`/api/projects/${projectId}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);

    const res = await request(app)
      .post(`/api/projects/${projectId}/dictamenes`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ verdict: "APPROVED", comment: "No debería poder" });
    expect(res.status).toBe(409);
  });

  describe("dictamen history visible only to insiders (WU-12)", () => {
    it("returns 404 listing dictamenes for an anonymous visitor and an authenticated outsider, on a PUBLIC project", async () => {
      const owner = await registerUser("STUDENT", "Owner Dictamen Privacy");
      const outsider = await registerUser("STUDENT", "Outsider Dictamen Privacy");
      const project = await createPublishedProject(owner.token);

      const anonRes = await request(app).get(`/api/projects/${project.id}/dictamenes`);
      expect(anonRes.status).toBe(404);

      const outsiderRes = await request(app)
        .get(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${outsider.token}`);
      expect(outsiderRes.status).toBe(404);
    });

    it("returns 200 listing dictamenes for the owner, an accepted member, and the confirmed evaluator", async () => {
      const owner = await registerUser("STUDENT", "Owner Dictamen Insiders");
      const teacher = await registerUser("TEACHER", "Teacher Dictamen Insiders");
      const project = await createProjectWithAcceptedEvaluator(
        owner.token,
        teacher.token,
        teacher.user.id,
      );
      const member = await addAcceptedMember(owner.token, project.id);

      await request(app)
        .post(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${teacher.token}`)
        .send({ verdict: "APPROVED", comment: "Todo en orden" });

      const ownerRes = await request(app)
        .get(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${owner.token}`);
      expect(ownerRes.status).toBe(200);

      const memberRes = await request(app)
        .get(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${member.token}`);
      expect(memberRes.status).toBe(200);

      const evaluatorRes = await request(app)
        .get(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${teacher.token}`);
      expect(evaluatorRes.status).toBe(200);
    });
  });
});
