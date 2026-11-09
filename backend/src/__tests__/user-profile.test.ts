import { describe, expect, it } from "vitest";
import {
  app,
  createProjectWithAcceptedEvaluator,
  createPublishedProject,
  registerUser,
  request,
} from "./helpers";

async function addAcceptedMember(ownerToken: string, projectId: number) {
  const member = await registerUser("STUDENT", "Profile Member");
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

describe("public user profile", () => {
  describe("GET /api/users/:id", () => {
    it("returns the public profile for an anonymous visitor, without email or passwordHash", async () => {
      const user = await registerUser("STUDENT", "Profile Public");

      const res = await request(app).get(`/api/users/${user.user.id}`);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(user.user.id);
      expect(res.body.name).toBe(user.user.name);
      expect(res.body.followerCount).toBe(0);
      expect(res.body.followingCount).toBe(0);
      expect(res.body.followedByMe).toBe(false);
      expect(res.body.email).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
      expect(JSON.stringify(res.body)).not.toContain(user.user.email);
    });

    it("returns 404 for an unknown numeric id", async () => {
      const res = await request(app).get("/api/users/999999999");
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Usuario no encontrado.");
    });

    it("returns 404 for a non-numeric id", async () => {
      const res = await request(app).get("/api/users/abc");
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Usuario no encontrado.");
    });
  });

  describe("PATCH /api/users/me — semester and cvUrl", () => {
    it("lets a STUDENT set a semester", async () => {
      const student = await registerUser("STUDENT", "Profile Student Semester");
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${student.token}`)
        .send({ semester: 5 });
      expect(res.status).toBe(200);
      expect(res.body.semester).toBe(5);
    });

    it("rejects a semester for a TEACHER account with 400", async () => {
      const teacher = await registerUser("TEACHER", "Profile Teacher Semester");
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${teacher.token}`)
        .send({ semester: 3 });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Solo las cuentas de estudiante tienen semestre.");
    });

    it("rejects a semester out of the 1-12 range with 400", async () => {
      const student = await registerUser("STUDENT", "Profile Student Range");
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${student.token}`)
        .send({ semester: 13 });
      expect(res.status).toBe(400);
    });

    it("sets cvUrl and then clears it back to null", async () => {
      const user = await registerUser("STUDENT", "Profile CV");
      const setRes = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ cvUrl: "https://example.com/cv.pdf" });
      expect(setRes.status).toBe(200);
      expect(setRes.body.cvUrl).toBe("https://example.com/cv.pdf");

      const clearRes = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ cvUrl: null });
      expect(clearRes.status).toBe(200);
      expect(clearRes.body.cvUrl).toBeNull();
    });

    it("rejects a non-http(s) cvUrl with 400", async () => {
      const user = await registerUser("STUDENT", "Profile CV Bad Url");
      const res = await request(app)
        .patch("/api/users/me")
        .set("Authorization", `Bearer ${user.token}`)
        .send({ cvUrl: "javascript:alert(1)" });
      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/users/:id/projects", () => {
    it("includes own PUBLIC projects and PUBLIC projects as an accepted MEMBER, excludes PRIVATE, pending-only, and EVALUATOR-only projects", async () => {
      const owner = await registerUser("STUDENT", "Profile Projects Owner");
      const teacher = await registerUser("TEACHER", "Profile Projects Teacher");
      const pendingRequester = await registerUser("STUDENT", "Profile Projects Pending");

      const ownPublicProject = await createPublishedProject(owner.token, {
        name: `Own public ${Date.now()}`,
      });
      const privateProject = await createPublishedProject(owner.token, {
        name: `Own private ${Date.now()}`,
        visibility: "PRIVATE",
      });
      const evaluatorProject = await createProjectWithAcceptedEvaluator(
        owner.token,
        teacher.token,
        teacher.user.id,
        { visibility: "PUBLIC", name: `Evaluator project ${Date.now()}` },
      );
      const member = await addAcceptedMember(owner.token, ownPublicProject.id);

      // A second owner's project where `member` is only a PENDING requester.
      const otherOwner = await registerUser("STUDENT", "Profile Projects OtherOwner");
      const pendingProject = await createPublishedProject(otherOwner.token, {
        name: `Pending only ${Date.now()}`,
      });
      await request(app)
        .post(`/api/projects/${pendingProject.id}/team-requests`)
        .set("Authorization", `Bearer ${pendingRequester.token}`)
        .send({ message: "Quiero sumarme" });

      const ownerProjectsRes = await request(app).get(`/api/users/${owner.user.id}/projects`);
      expect(ownerProjectsRes.status).toBe(200);
      const ownerProjectIds = ownerProjectsRes.body.map((p: any) => p.id);
      expect(ownerProjectIds).toContain(ownPublicProject.id);
      expect(ownerProjectIds).not.toContain(privateProject.id);

      const memberProjectsRes = await request(app).get(`/api/users/${member.user.id}/projects`);
      expect(memberProjectsRes.status).toBe(200);
      const memberProjectIds = memberProjectsRes.body.map((p: any) => p.id);
      expect(memberProjectIds).toContain(ownPublicProject.id);

      const teacherProjectsRes = await request(app).get(`/api/users/${teacher.user.id}/projects`);
      expect(teacherProjectsRes.status).toBe(200);
      const teacherProjectIds = teacherProjectsRes.body.map((p: any) => p.id);
      // The teacher is a confirmed EVALUATOR on `evaluatorProject`, not an
      // owner/MEMBER — excluded from "involved in" (an evaluator role is not
      // authorship).
      expect(teacherProjectIds).not.toContain(evaluatorProject.id);

      const pendingRequesterProjectsRes = await request(app).get(
        `/api/users/${pendingRequester.user.id}/projects`,
      );
      expect(pendingRequesterProjectsRes.status).toBe(200);
      expect(pendingRequesterProjectsRes.body.map((p: any) => p.id)).not.toContain(pendingProject.id);
    });

    it("returns an empty array for an unknown user id", async () => {
      const res = await request(app).get("/api/users/999999999/projects");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });
});
