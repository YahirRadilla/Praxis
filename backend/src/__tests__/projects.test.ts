import { describe, expect, it } from "vitest";
import {
  app,
  createPublishedProject,
  createProjectFor,
  createProjectWithAcceptedEvaluator,
  prisma,
  registerUser,
  request,
} from "./helpers";

describe("project lifecycle: visibility and archived", () => {
  it("creates a project and it appears in public search when visibility is PUBLIC", async () => {
    const owner = await registerUser("STUDENT", "Owner Search");
    const published = await createPublishedProject(owner.token, {
      name: `Buscable ${Date.now()}`,
    });
    expect(published.visibility).toBe("PUBLIC");

    const searchRes = await request(app).get("/api/projects");
    expect(searchRes.status).toBe(200);
    const ids = searchRes.body.map((p: any) => p.id);
    expect(ids).toContain(published.id);
  });

  it("defaults to PRIVATE visibility when not specified", async () => {
    const owner = await registerUser("STUDENT", "Owner Default Visibility");
    const created = await createProjectFor(owner.token);
    expect(created.status).toBe(201);
    expect(created.body.visibility).toBe("PRIVATE");
  });

  it("a PRIVATE project does not appear in public search, and is invisible to anonymous requests but visible to its owner", async () => {
    const owner = await registerUser("STUDENT", "Owner Private");
    const privateProject = await createProjectFor(owner.token, {
      name: `Privado ${Date.now()}`,
      visibility: "PRIVATE",
    });
    expect(privateProject.status).toBe(201);
    const projectId = privateProject.body.id;

    const searchRes = await request(app).get("/api/projects");
    const ids = searchRes.body.map((p: any) => p.id);
    expect(ids).not.toContain(projectId);

    const anonRes = await request(app).get(`/api/projects/${projectId}`);
    expect(anonRes.status).toBe(404);

    const ownerRes = await request(app)
      .get(`/api/projects/${projectId}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(ownerRes.status).toBe(200);
  });

  it("rejects evaluatorInviteIds pointing at the wrong account type, or at the owner", async () => {
    const owner = await registerUser("STUDENT", "Owner Teacher");
    const notATeacher = await registerUser("STUDENT", "Not Teacher");

    const withNonTeacher = await createProjectFor(owner.token, {
      evaluatorInviteIds: [notATeacher.user.id],
    });
    expect(withNonTeacher.status).toBe(400);

    const withSelf = await createProjectFor(owner.token, {
      evaluatorInviteIds: [owner.user.id],
    });
    expect(withSelf.status).toBe(400);
  });

  it("creating a project with evaluatorInviteIds sends pending EVALUATOR invites without filling teacherId/organizationId", async () => {
    const owner = await registerUser("STUDENT", "Owner Evaluator Invite");
    const teacher = await registerUser("TEACHER", "Evaluator Invite Teacher");
    const organization = await registerUser("ORGANIZATION", "Evaluator Invite Org");

    const created = await createProjectFor(owner.token, {
      evaluatorInviteIds: [teacher.user.id, organization.user.id],
    });
    expect(created.status).toBe(201);
    // Invites never fill the field at creation time (plan decision #6) —
    // only accepting them does (see team.test.ts).
    expect(created.body.teacherId).toBeNull();
    expect(created.body.organizationId).toBeNull();

    const pending = await prisma.teamRequest.findMany({
      where: { projectId: created.body.id, purpose: "EVALUATOR" },
    });
    expect(pending).toHaveLength(2);
    expect(pending.every((r) => r.status === "PENDING" && r.initiatedBy === "OWNER")).toBe(true);
  });

  it("rejects more than one evaluator invite for the same slot (two teachers) at creation", async () => {
    const owner = await registerUser("STUDENT", "Owner Two Teachers");
    const teacherA = await registerUser("TEACHER", "Teacher Slot A");
    const teacherB = await registerUser("TEACHER", "Teacher Slot B");

    const created = await createProjectFor(owner.token, {
      evaluatorInviteIds: [teacherA.user.id, teacherB.user.id],
    });
    expect(created.status).toBe(400);
  });

  it("strips teacherId/organizationId from project creation — they're not accepted creation fields", async () => {
    const owner = await registerUser("STUDENT", "Owner Strict Create");
    const teacher = await registerUser("TEACHER", "Strict Create Teacher");

    const created = await createProjectFor(owner.token, { teacherId: teacher.user.id });
    expect(created.status).toBe(400);
  });

  it("rejects a PATCH payload containing teacherId — it's not an accepted update field", async () => {
    const owner = await registerUser("STUDENT", "Owner Strict Patch");
    const teacher = await registerUser("TEACHER", "Strict Patch Teacher");
    const project = await createPublishedProject(owner.token);

    const res = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ teacherId: teacher.user.id });
    expect(res.status).toBe(400);
  });

  it("archives a project from any prior state, owner-only, and reverses with unarchive", async () => {
    const owner = await registerUser("STUDENT", "Owner Archive");
    const other = await registerUser("STUDENT", "Other Archive");
    const project = await createPublishedProject(owner.token);

    const forbidden = await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(forbidden.status).toBe(403);

    const archived = await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(archived.status).toBe(200);
    expect(archived.body.archived).toBe(true);
    expect(archived.body.archivedAt).not.toBeNull();

    // Idempotent: archiving an already-archived project is still a 200.
    const archivedAgain = await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(archivedAgain.status).toBe(200);
    expect(archivedAgain.body.archived).toBe(true);

    const unarchived = await request(app)
      .post(`/api/projects/${project.id}/unarchive`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(unarchived.status).toBe(200);
    expect(unarchived.body.archived).toBe(false);
    expect(unarchived.body.archivedAt).toBeNull();
  });

  it("an archived project stays visible in public search (it's read-only, not hidden)", async () => {
    const owner = await registerUser("STUDENT", "Owner Archived Search");
    const project = await createPublishedProject(owner.token, {
      name: `Archivado visible ${Date.now()}`,
    });

    await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);

    const searchRes = await request(app).get("/api/projects");
    const ids = searchRes.body.map((p: any) => p.id);
    expect(ids).toContain(project.id);
  });

  it("rejects writes on an archived project: new activity, anexo, avance, and label", async () => {
    const owner = await registerUser("STUDENT", "Owner Archived Writes");
    const project = await createPublishedProject(owner.token);

    await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);

    const activityRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "No debería crearse", dueDate: new Date().toISOString() });
    expect(activityRes.status).toBe(409);

    const resourceRes = await request(app)
      .post(`/api/projects/${project.id}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ type: "LINK", url: "https://example.com", label: "Anexo" });
    expect(resourceRes.status).toBe(409);

    const progressRes = await request(app)
      .post(`/api/projects/${project.id}/progress-updates`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ text: "Avance que no debería registrarse" });
    expect(progressRes.status).toBe(409);

    const labelRes = await request(app)
      .post(`/api/projects/${project.id}/labels`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Urgente", colorHex: "#FF0000" });
    expect(labelRes.status).toBe(409);
  });

  it("rejects most project updates on an archived project, except a payload with only visibility", async () => {
    const owner = await registerUser("STUDENT", "Owner Archived Update");
    const project = await createPublishedProject(owner.token);

    await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);

    const blocked = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Nuevo nombre" });
    expect(blocked.status).toBe(409);

    const allowed = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ visibility: "PRIVATE" });
    expect(allowed.status).toBe(200);
    expect(allowed.body.visibility).toBe("PRIVATE");
  });
});

describe("WU-07: viewer permissions on project responses", () => {
  it("omits `viewer` entirely for an anonymous request on a PUBLIC project", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Anon");
    const project = await createPublishedProject(owner.token);

    const res = await request(app).get(`/api/projects/${project.id}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toBeUndefined();
    expect("viewer" in res.body).toBe(false);
  });

  it("gives an authenticated outsider a full-false viewer with canRequestToJoin true", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Outsider");
    const outsider = await registerUser("STUDENT", "Outsider Viewer");
    const project = await createPublishedProject(owner.token);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toEqual({
      isOwner: false,
      isMember: false,
      isEvaluator: false,
      pendingRequest: null,
      canRequestToJoin: true,
      canPost: false,
      canSubmitDictamen: false,
      canSeeBoard: false,
    });
  });

  it("marks the owner's viewer with isOwner/isMember true and canRequestToJoin false", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Owner");
    const project = await createPublishedProject(owner.token);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toMatchObject({
      isOwner: true,
      isMember: true,
      isEvaluator: false,
      pendingRequest: null,
      canRequestToJoin: false,
      canPost: true,
      canSubmitDictamen: false,
      canSeeBoard: true,
    });
  });

  it("surfaces a self-initiated pending request (REQUESTER) and blocks a second one", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Pending Req");
    const requester = await registerUser("STUDENT", "Requester Viewer Pending");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${requester.token}`)
      .send({ message: "Quiero sumarme" });
    expect(joinRes.status).toBe(201);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${requester.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toMatchObject({
      isOwner: false,
      isMember: false,
      isEvaluator: false,
      pendingRequest: { id: joinRes.body.id, initiatedBy: "REQUESTER", purpose: "MEMBER" },
      canRequestToJoin: false,
      canPost: false,
      canSubmitDictamen: false,
      canSeeBoard: false,
    });
  });

  it("surfaces an owner-initiated pending invite (OWNER) from the invitee's viewer", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Pending Invite");
    const invitee = await registerUser("STUDENT", "Invitee Viewer Pending");
    const project = await createPublishedProject(owner.token);

    const inviteRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: invitee.user.id, purpose: "MEMBER" });
    expect(inviteRes.status).toBe(201);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${invitee.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toMatchObject({
      isOwner: false,
      isMember: false,
      isEvaluator: false,
      pendingRequest: { id: inviteRes.body.id, initiatedBy: "OWNER", purpose: "MEMBER" },
      canRequestToJoin: false,
    });
  });

  it("lets a rejected requester request again (REJECTED does not block canRequestToJoin)", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Rejected");
    const requester = await registerUser("STUDENT", "Requester Viewer Rejected");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${requester.token}`)
      .send({});
    expect(joinRes.status).toBe(201);

    const rejectRes = await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "REJECTED" });
    expect(rejectRes.status).toBe(200);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${requester.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toMatchObject({
      isMember: false,
      pendingRequest: null,
      canRequestToJoin: true,
    });
  });

  it("marks an accepted MEMBER's viewer with isMember/canPost/canSeeBoard true", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Member");
    const member = await registerUser("STUDENT", "Member Viewer Accepted");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({});
    await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toMatchObject({
      isOwner: false,
      isMember: true,
      isEvaluator: false,
      pendingRequest: null,
      canRequestToJoin: false,
      canPost: true,
      canSubmitDictamen: false,
      canSeeBoard: true,
    });
  });

  it("marks a confirmed evaluator's viewer with isEvaluator/canSubmitDictamen/canSeeBoard true, canPost false", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Evaluator");
    const teacher = await registerUser("TEACHER", "Teacher Viewer Evaluator");
    const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toMatchObject({
      isOwner: false,
      isMember: false,
      isEvaluator: true,
      pendingRequest: null,
      canRequestToJoin: false,
      canPost: false,
      canSubmitDictamen: true,
      canSeeBoard: true,
    });
  });

  it("on an archived project, turns canPost/canSubmitDictamen/canRequestToJoin false but keeps canSeeBoard true for existing members/evaluators", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Archived");
    const member = await registerUser("STUDENT", "Member Viewer Archived");
    const outsider = await registerUser("STUDENT", "Outsider Viewer Archived");
    const teacher = await registerUser("TEACHER", "Teacher Viewer Archived");
    const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id, {
      visibility: "PUBLIC",
    });

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({});
    await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });

    await request(app)
      .post(`/api/projects/${project.id}/archive`)
      .set("Authorization", `Bearer ${owner.token}`);

    const ownerRes = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(ownerRes.body.viewer).toMatchObject({
      canPost: false,
      canRequestToJoin: false,
      canSeeBoard: true,
    });

    const memberRes = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(memberRes.body.viewer).toMatchObject({
      isMember: true,
      canPost: false,
      canRequestToJoin: false,
      canSeeBoard: true,
    });

    const evaluatorRes = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(evaluatorRes.body.viewer).toMatchObject({
      isEvaluator: true,
      canSubmitDictamen: false,
      canRequestToJoin: false,
      canSeeBoard: true,
    });

    const outsiderRes = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderRes.body.viewer).toMatchObject({
      canRequestToJoin: false,
      canSeeBoard: false,
    });
  });

  it("GET /projects (public search) never includes a `viewer` field, even for an authenticated requester", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Search");
    const other = await registerUser("STUDENT", "Other Viewer Search");
    await createPublishedProject(owner.token, { name: `Buscable viewer ${Date.now()}` });

    const res = await request(app)
      .get("/api/projects")
      .set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(200);
    expect(res.body.every((p: any) => !("viewer" in p))).toBe(true);
  });

  it("GET /projects/mine returns a correct viewer per project (member, evaluator, owner), via one batched TeamRequest query", async () => {
    const owner = await registerUser("STUDENT", "Owner Viewer Mine");
    const member = await registerUser("STUDENT", "Member Viewer Mine");
    const teacher = await registerUser("TEACHER", "Teacher Viewer Mine");

    const projectA = await createPublishedProject(owner.token, { name: `Mine A ${Date.now()}` });
    const projectB = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id, {
      name: `Mine B ${Date.now()}`,
      visibility: "PUBLIC",
    });

    const joinRes = await request(app)
      .post(`/api/projects/${projectA.id}/team-requests`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({});
    await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });

    const memberMine = await request(app)
      .get("/api/projects/mine")
      .set("Authorization", `Bearer ${member.token}`);
    expect(memberMine.status).toBe(200);
    const bodyA = memberMine.body.find((p: any) => p.id === projectA.id);
    expect(bodyA.viewer).toMatchObject({ isMember: true, canPost: true, pendingRequest: null });

    const teacherMine = await request(app)
      .get("/api/projects/mine")
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(teacherMine.status).toBe(200);
    const bodyB = teacherMine.body.find((p: any) => p.id === projectB.id);
    expect(bodyB.viewer).toMatchObject({
      isEvaluator: true,
      canSubmitDictamen: true,
      pendingRequest: null,
    });

    const ownerMine = await request(app)
      .get("/api/projects/mine")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(ownerMine.status).toBe(200);
    for (const project of ownerMine.body) {
      expect(project.viewer.isOwner).toBe(true);
    }
  });
});

describe("WU-08 gap fix: pendingEvaluatorInvites survives a reload", () => {
  it("shows the owner a pending evaluator invite on a fresh GET after sending it", async () => {
    const owner = await registerUser("STUDENT", "Owner Pending Invite");
    const teacher = await registerUser("TEACHER", "Teacher Pending Invite");
    const project = await createPublishedProject(owner.token);

    const inviteRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacher.user.id, purpose: "EVALUATOR" });
    expect(inviteRes.status).toBe(201);

    // A fresh GET, not a reused mutation result — this is the "page reload"
    // WU-08 left as session-only local state and this fix closes.
    const reloaded = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(reloaded.status).toBe(200);
    expect(reloaded.body.pendingEvaluatorInvites).toEqual({
      teacher: { id: teacher.user.id, name: teacher.user.name },
      organization: null,
    });
  });

  it("clears the pending invite from the owner's view once it's accepted", async () => {
    const owner = await registerUser("STUDENT", "Owner Pending Invite Accepted");
    const teacher = await registerUser("TEACHER", "Teacher Pending Invite Accepted");
    const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id);

    const res = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.status).toBe(200);
    expect(res.body.pendingEvaluatorInvites).toEqual({ teacher: null, organization: null });
  });

  it("omits pendingEvaluatorInvites for a non-owner request", async () => {
    const owner = await registerUser("STUDENT", "Owner Pending Invite Non Owner");
    const teacher = await registerUser("TEACHER", "Teacher Pending Invite Non Owner");
    const outsider = await registerUser("STUDENT", "Outsider Pending Invite");
    const project = await createPublishedProject(owner.token);

    await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacher.user.id, purpose: "EVALUATOR" });

    const outsiderRes = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderRes.status).toBe(200);
    expect("pendingEvaluatorInvites" in outsiderRes.body).toBe(false);

    const anonRes = await request(app).get(`/api/projects/${project.id}`);
    expect(anonRes.status).toBe(200);
    expect("pendingEvaluatorInvites" in anonRes.body).toBe(false);
  });
});
