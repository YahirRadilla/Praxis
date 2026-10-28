import { describe, expect, it } from "vitest";
import {
  app,
  createPublishedProject,
  createProjectWithAcceptedEvaluator,
  ensureSdg,
  registerUser,
  request,
} from "./helpers";

async function addAcceptedMember(ownerToken: string, projectId: number) {
  const member = await registerUser("STUDENT", "Email Privacy Member");
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

describe("plan decision #11 (WU-13): emails hidden from project outsiders", () => {
  describe("GET /projects/:id", () => {
    it("hides owner/teacher/organization email from an anonymous visitor and an authenticated outsider, on a PUBLIC project", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Detail");
      const outsider = await registerUser("STUDENT", "Outsider Email Detail");
      const teacher = await registerUser("TEACHER", "Teacher Email Detail");
      const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id, {
        visibility: "PUBLIC",
      });

      const anonRes = await request(app).get(`/api/projects/${project.id}`);
      expect(anonRes.status).toBe(200);
      expect(anonRes.body.owner.email).toBeUndefined();
      expect(anonRes.body.teacher.email).toBeUndefined();

      const outsiderRes = await request(app)
        .get(`/api/projects/${project.id}`)
        .set("Authorization", `Bearer ${outsider.token}`);
      expect(outsiderRes.status).toBe(200);
      expect(outsiderRes.body.owner.email).toBeUndefined();
      expect(outsiderRes.body.teacher.email).toBeUndefined();
    });

    it("gives the owner, an accepted member, and the confirmed evaluator the owner/teacher email", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Insider");
      const teacher = await registerUser("TEACHER", "Teacher Email Insider");
      const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id, {
        visibility: "PUBLIC",
      });
      const member = await addAcceptedMember(owner.token, project.id);

      const ownerRes = await request(app)
        .get(`/api/projects/${project.id}`)
        .set("Authorization", `Bearer ${owner.token}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body.owner.email).toBe(owner.user.email);
      expect(ownerRes.body.teacher.email).toBe(teacher.user.email);

      const memberRes = await request(app)
        .get(`/api/projects/${project.id}`)
        .set("Authorization", `Bearer ${member.token}`);
      expect(memberRes.status).toBe(200);
      expect(memberRes.body.owner.email).toBe(owner.user.email);
      expect(memberRes.body.teacher.email).toBe(teacher.user.email);

      const evaluatorRes = await request(app)
        .get(`/api/projects/${project.id}`)
        .set("Authorization", `Bearer ${teacher.token}`);
      expect(evaluatorRes.status).toBe(200);
      expect(evaluatorRes.body.owner.email).toBe(owner.user.email);
      expect(evaluatorRes.body.teacher.email).toBe(teacher.user.email);
    });
  });

  describe("GET /projects (public search)", () => {
    it("never includes an email, even for an authenticated requester who owns one of the results", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Search");
      await createPublishedProject(owner.token, { name: `Buscable email ${Date.now()}` });

      const res = await request(app)
        .get("/api/projects")
        .set("Authorization", `Bearer ${owner.token}`);
      expect(res.status).toBe(200);
      const bodies = JSON.stringify(res.body);
      expect(bodies).not.toContain(owner.user.email);
    });
  });

  describe("GET /projects/:projectId/team", () => {
    it("hides every member's email from an anonymous visitor and an authenticated outsider, on a PUBLIC project", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Team");
      const outsider = await registerUser("STUDENT", "Outsider Email Team");
      const project = await createPublishedProject(owner.token, { visibility: "PUBLIC" });
      const member = await addAcceptedMember(owner.token, project.id);

      const anonRes = await request(app).get(`/api/projects/${project.id}/team`);
      expect(anonRes.status).toBe(200);
      for (const row of anonRes.body) {
        expect(row.email).toBeUndefined();
      }

      const outsiderRes = await request(app)
        .get(`/api/projects/${project.id}/team`)
        .set("Authorization", `Bearer ${outsider.token}`);
      expect(outsiderRes.status).toBe(200);
      for (const row of outsiderRes.body) {
        expect(row.email).toBeUndefined();
      }
      // sanity: the member really is in the list, just without an email.
      expect(outsiderRes.body.map((r: any) => r.id)).toContain(member.user.id);
    });

    it("gives the owner, an accepted member, and the confirmed evaluator every member's email", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Team Insider");
      const teacher = await registerUser("TEACHER", "Teacher Email Team Insider");
      const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id, {
        visibility: "PUBLIC",
      });
      const member = await addAcceptedMember(owner.token, project.id);

      for (const viewer of [owner, member, teacher]) {
        const res = await request(app)
          .get(`/api/projects/${project.id}/team`)
          .set("Authorization", `Bearer ${viewer.token}`);
        expect(res.status).toBe(200);
        const ownerRow = res.body.find((r: any) => r.role === "OWNER");
        expect(ownerRow.email).toBe(owner.user.email);
        const memberRow = res.body.find((r: any) => r.id === member.user.id);
        expect(memberRow.email).toBe(member.user.email);
      }
    });
  });

  describe("owner's own pending/received requests keep the requester's email", () => {
    it("keeps the requester's email on the project's own Equipo 'Solicitudes pendientes' list", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Pending");
      const requester = await registerUser("STUDENT", "Requester Email Pending");
      const project = await createPublishedProject(owner.token);

      await request(app)
        .post(`/api/projects/${project.id}/team-requests`)
        .set("Authorization", `Bearer ${requester.token}`)
        .send({ message: "Quiero sumarme" });

      const res = await request(app)
        .get(`/api/projects/${project.id}/team-requests`)
        .set("Authorization", `Bearer ${owner.token}`);
      expect(res.status).toBe(200);
      expect(res.body[0].user.email).toBe(requester.user.email);
    });

    it("keeps the requester's email on the cross-project 'received requests' page", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Received");
      const requester = await registerUser("STUDENT", "Requester Email Received");
      const project = await createPublishedProject(owner.token);

      await request(app)
        .post(`/api/projects/${project.id}/team-requests`)
        .set("Authorization", `Bearer ${requester.token}`)
        .send({ message: "Quiero sumarme" });

      const res = await request(app)
        .get("/api/team-requests/received")
        .set("Authorization", `Bearer ${owner.token}`);
      expect(res.status).toBe(200);
      expect(res.body[0].user.email).toBe(requester.user.email);
    });
  });

  describe("GET /projects/:projectId/dictamenes", () => {
    it("returns 404 for an outsider (already insider-only, WU-12) and includes the evaluator's email for insiders", async () => {
      const owner = await registerUser("STUDENT", "Owner Email Dictamen");
      const outsider = await registerUser("STUDENT", "Outsider Email Dictamen");
      const teacher = await registerUser("TEACHER", "Teacher Email Dictamen");
      const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id);

      await request(app)
        .post(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${teacher.token}`)
        .send({ verdict: "APPROVED", comment: "Todo en orden" });

      const outsiderRes = await request(app)
        .get(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${outsider.token}`);
      expect(outsiderRes.status).toBe(404);

      const ownerRes = await request(app)
        .get(`/api/projects/${project.id}/dictamenes`)
        .set("Authorization", `Bearer ${owner.token}`);
      expect(ownerRes.status).toBe(200);
      expect(ownerRes.body[0].evaluator.email).toBe(teacher.user.email);
    });
  });

  describe("GET /challenges (Retos) — organization email stays public (explicit exception)", () => {
    it("keeps organization.email on a challenge listing and a single challenge read", async () => {
      const organization = await registerUser("ORGANIZATION", "Org Email Reto");
      const sdgId = await ensureSdg();

      const createRes = await request(app)
        .post("/api/challenges")
        .set("Authorization", `Bearer ${organization.token}`)
        .send({
          title: `Reto email ${Date.now()}`,
          description: "Descripción del reto",
          sdgIds: [sdgId],
        });
      expect(createRes.status).toBe(201);

      const listRes = await request(app).get("/api/challenges");
      expect(listRes.status).toBe(200);
      const created = listRes.body.find((c: any) => c.id === createRes.body.id);
      expect(created.organization.email).toBe(organization.user.email);

      const getRes = await request(app).get(`/api/challenges/${createRes.body.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.organization.email).toBe(organization.user.email);
    });
  });
});
