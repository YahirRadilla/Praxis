import { describe, expect, it } from "vitest";
import {
  app,
  createPublishedProject,
  createProjectWithAcceptedEvaluator,
  prisma,
  registerUser,
  request,
} from "./helpers";
import { isProjectMember, listTeam } from "../services/team-request.service";

describe("team requests and project membership", () => {
  it("lets a user request to join, the owner accept, and the requester becomes a member", async () => {
    const owner = await registerUser("STUDENT", "Owner Team");
    const requester = await registerUser("STUDENT", "Requester Team");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${requester.token}`)
      .send({ message: "Quiero sumarme" });
    expect(joinRes.status).toBe(201);

    const acceptRes = await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe("ACCEPTED");

    // Member-only endpoint: creating an activity on the project.
    const activityRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${requester.token}`)
      .send({ title: "Tarea del equipo", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(activityRes.status).toBe(201);
  });

  it("rejects a non-member creating or moving an Activity with 403", async () => {
    const owner = await registerUser("STUDENT", "Owner Nonmember");
    const outsider = await registerUser("STUDENT", "Outsider Nonmember");
    const project = await createPublishedProject(owner.token);

    const createRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ title: "No debería poder", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(createRes.status).toBe(403);

    const ownerActivityRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ title: "Tarea del owner", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(ownerActivityRes.status).toBe(201);

    const moveRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${ownerActivityRes.body.id}/move`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ status: "IN_PROGRESS", position: 0 });
    expect(moveRes.status).toBe(403);
  });

  it("an accepted EVALUATOR-purpose team request is not team membership", async () => {
    const owner = await registerUser("STUDENT", "Owner Evaluator Purpose");
    const evaluator = await registerUser("TEACHER", "Evaluator Purpose");
    const project = await createPublishedProject(owner.token);

    // WU-05 adds the real invitation endpoint for EVALUATOR-purpose requests;
    // for now, create the row directly the way seed.ts does for demo data.
    await prisma.teamRequest.create({
      data: {
        projectId: project.id,
        userId: evaluator.user.id,
        purpose: "EVALUATOR",
        status: "ACCEPTED",
        initiatedBy: "OWNER",
        resolvedAt: new Date(),
      },
    });

    expect(await isProjectMember(project.id, evaluator.user.id)).toBe(false);

    // Member-only endpoint: an accepted evaluator still can't create an
    // activity, the same way a complete outsider can't.
    const activityRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${evaluator.token}`)
      .send({ title: "No debería poder", dueDate: new Date(Date.now() + 86_400_000).toISOString() });
    expect(activityRes.status).toBe(403);

    // listTeam only returns MEMBER-purpose rows; the evaluator must not leak
    // in through it.
    const team = await listTeam(project.id, owner.user.id);
    expect(team.map((member) => member.id)).not.toContain(evaluator.user.id);
  });
});

describe("evaluator consent through team request invitations (WU-05)", () => {
  it("invites a teacher as evaluator, and accepting fills teacherId while leaving visibility/archived untouched", async () => {
    const owner = await registerUser("STUDENT", "Owner Evaluator Accept");
    const teacher = await registerUser("TEACHER", "Evaluator Accept Teacher");
    const project = await createPublishedProject(owner.token);

    const inviteRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacher.user.id, purpose: "EVALUATOR" });
    expect(inviteRes.status).toBe(201);
    expect(inviteRes.body.purpose).toBe("EVALUATOR");

    const afterInvite = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(afterInvite.body.teacherId).toBeNull();

    const acceptRes = await request(app)
      .patch(`/api/team-requests/${inviteRes.body.id}`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ status: "ACCEPTED" });
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.status).toBe("ACCEPTED");

    const afterAccept = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(afterAccept.body.teacherId).toBe(teacher.user.id);

    // The now-confirmed evaluator didn't become a team member.
    expect(await isProjectMember(project.id, teacher.user.id)).toBe(false);
  });

  it("rejecting an evaluator invite never fills teacherId/organizationId", async () => {
    const owner = await registerUser("STUDENT", "Owner Evaluator Reject");
    const organization = await registerUser("ORGANIZATION", "Evaluator Reject Org");
    const project = await createPublishedProject(owner.token);

    const inviteRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: organization.user.id, purpose: "EVALUATOR" });
    expect(inviteRes.status).toBe(201);

    const rejectRes = await request(app)
      .patch(`/api/team-requests/${inviteRes.body.id}`)
      .set("Authorization", `Bearer ${organization.token}`)
      .send({ status: "REJECTED" });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe("REJECTED");

    const afterReject = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(afterReject.body.organizationId).toBeNull();
  });

  it("rejects inviting someone of the wrong account type as evaluator with 400", async () => {
    const owner = await registerUser("STUDENT", "Owner Evaluator Wrong Type");
    const student = await registerUser("STUDENT", "Evaluator Wrong Type Student");
    const project = await createPublishedProject(owner.token);

    const inviteRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: student.user.id, purpose: "EVALUATOR" });
    expect(inviteRes.status).toBe(400);
  });

  it("rejects a second evaluator invite for an already-filled slot, and a second pending invite for the same slot", async () => {
    const owner = await registerUser("STUDENT", "Owner Evaluator Slot");
    const teacherA = await registerUser("TEACHER", "Evaluator Slot Teacher A");
    const teacherB = await registerUser("TEACHER", "Evaluator Slot Teacher B");
    const project = await createPublishedProject(owner.token);

    const firstInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacherA.user.id, purpose: "EVALUATOR" });
    expect(firstInvite.status).toBe(201);

    // Slot has a pending invite already -> second invite for the same slot
    // (another teacher) is rejected before it's even accepted.
    const secondInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacherB.user.id, purpose: "EVALUATOR" });
    expect(secondInvite.status).toBe(409);

    await request(app)
      .patch(`/api/team-requests/${firstInvite.body.id}`)
      .set("Authorization", `Bearer ${teacherA.token}`)
      .send({ status: "ACCEPTED" });

    // Slot is now filled -> inviting a third teacher for it is rejected too.
    const teacherC = await registerUser("TEACHER", "Evaluator Slot Teacher C");
    const thirdInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacherC.user.id, purpose: "EVALUATOR" });
    expect(thirdInvite.status).toBe(409);
  });

  it("rejects inviting an already-accepted team member as an evaluator (projectId+userId stays unique)", async () => {
    const owner = await registerUser("STUDENT", "Owner Member To Evaluator");
    const member = await registerUser("TEACHER", "Member To Evaluator Teacher");
    const project = await createPublishedProject(owner.token);

    const memberInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id });
    expect(memberInvite.status).toBe(201);
    expect(memberInvite.body.purpose).toBe("MEMBER");

    const acceptRes = await request(app)
      .patch(`/api/team-requests/${memberInvite.body.id}`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ status: "ACCEPTED" });
    expect(acceptRes.status).toBe(200);

    // Same project+user pair already has a row (the accepted MEMBER
    // request): the @@unique([projectId, userId]) constraint means there's
    // no way to also make them an EVALUATOR, so this 409s without any extra
    // validation beyond the existing-row check (plan decision #7).
    const evaluatorInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: member.user.id, purpose: "EVALUATOR" });
    expect(evaluatorInvite.status).toBe(409);
  });

  it("never lets a non-owner self-nominate as evaluator via requestToJoin", async () => {
    const owner = await registerUser("STUDENT", "Owner No Self Nominate");
    const requester = await registerUser("TEACHER", "No Self Nominate Teacher");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${requester.token}`)
      .send({ message: "Quiero evaluar este proyecto" });
    expect(joinRes.status).toBe(201);
    expect(joinRes.body.purpose).toBe("MEMBER");
  });
});

describe("team request lifecycle gaps (WU-06)", () => {
  it("excludes the owner's own outgoing invitations from both pending-request views", async () => {
    const owner = await registerUser("STUDENT", "Owner Own Invites");
    const invitee = await registerUser("STUDENT", "Own Invites Invitee");
    const project = await createPublishedProject(owner.token);

    await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: invitee.user.id });

    // The actionable "Solicitudes pendientes" list in the project's Equipo
    // tab must not show the owner's own outgoing invite.
    const pendingInProject = await request(app)
      .get(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(pendingInProject.status).toBe(200);
    expect(pendingInProject.body).toHaveLength(0);

    // Nor the cross-project "received requests" view.
    const receivedByOwner = await request(app)
      .get("/api/team-requests/received")
      .set("Authorization", `Bearer ${owner.token}`);
    expect(receivedByOwner.status).toBe(200);
    expect(receivedByOwner.body).toHaveLength(0);

    // A real incoming request (someone else asking to join) still shows up.
    const outsider = await registerUser("STUDENT", "Own Invites Outsider");
    await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${outsider.token}`)
      .send({ message: "Quiero sumarme" });

    const pendingAfterRealRequest = await request(app)
      .get(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(pendingAfterRealRequest.body).toHaveLength(1);
    expect(pendingAfterRealRequest.body[0].userId).toBe(outsider.user.id);
  });

  it("notifies the invitee with a link to /solicitudes-recibidas", async () => {
    const owner = await registerUser("STUDENT", "Owner Notif Link");
    const invitee = await registerUser("STUDENT", "Notif Link Invitee");
    const project = await createPublishedProject(owner.token);

    await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: invitee.user.id });

    const notification = await prisma.notification.findFirst({
      where: { userId: invitee.user.id, type: "TEAM_INVITE_RECEIVED" },
      orderBy: { createdAt: "desc" },
    });
    expect(notification?.link).toBe("/solicitudes-recibidas");
  });

  it("reuses a REJECTED requestToJoin row instead of permanently blocking the requester", async () => {
    const owner = await registerUser("STUDENT", "Owner Reuse Rejected");
    const requester = await registerUser("STUDENT", "Reuse Rejected Requester");
    const project = await createPublishedProject(owner.token);

    const firstJoin = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${requester.token}`)
      .send({ message: "Primer intento" });
    expect(firstJoin.status).toBe(201);
    const firstId = firstJoin.body.id;

    const reject = await request(app)
      .patch(`/api/team-requests/${firstId}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "REJECTED" });
    expect(reject.status).toBe(200);

    const secondJoin = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${requester.token}`)
      .send({ message: "Segundo intento" });
    expect(secondJoin.status).toBe(201);
    expect(secondJoin.body.id).toBe(firstId); // same row, reopened
    expect(secondJoin.body.status).toBe("PENDING");
    expect(secondJoin.body.message).toBe("Segundo intento");

    const row = await prisma.teamRequest.findUnique({ where: { id: firstId } });
    expect(row?.resolvedAt).toBeNull();
  });

  it("reuses a REJECTED inviteToTeam row instead of permanently blocking the owner", async () => {
    const owner = await registerUser("STUDENT", "Owner Reuse Rejected Invite");
    const invitee = await registerUser("STUDENT", "Reuse Rejected Invite Invitee");
    const project = await createPublishedProject(owner.token);

    const firstInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: invitee.user.id });
    expect(firstInvite.status).toBe(201);

    await request(app)
      .patch(`/api/team-requests/${firstInvite.body.id}`)
      .set("Authorization", `Bearer ${invitee.token}`)
      .send({ status: "REJECTED" });

    const secondInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: invitee.user.id });
    expect(secondInvite.status).toBe(201);
    expect(secondInvite.body.id).toBe(firstInvite.body.id);
    expect(secondInvite.body.status).toBe("PENDING");
  });

  it("still blocks with a purpose-aware message when the existing row is ACCEPTED", async () => {
    const owner = await registerUser("STUDENT", "Owner Accepted Blocks");
    const member = await registerUser("STUDENT", "Accepted Blocks Member");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({});
    await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });

    const secondJoin = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({});
    expect(secondJoin.status).toBe(409);
    expect(secondJoin.body.message).toMatch(/integrante/i);

    const teacher = await registerUser("TEACHER", "Accepted Blocks Teacher");
    const evalInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacher.user.id, purpose: "EVALUATOR" });
    await request(app)
      .patch(`/api/team-requests/${evalInvite.body.id}`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ status: "ACCEPTED" });

    const secondEvalInvite = await request(app)
      .post(`/api/projects/${project.id}/team-requests/invite`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ userId: teacher.user.id, purpose: "EVALUATOR" });
    expect(secondEvalInvite.status).toBe(409);
    expect(secondEvalInvite.body.message).toMatch(/evaluador/i);
  });

  it("lets a member leave the team, unassigning their activities but keeping their comments", async () => {
    const owner = await registerUser("STUDENT", "Owner Leave Member");
    const member = await registerUser("STUDENT", "Leave Member");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({});
    await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });

    const activityRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Tarea asignada",
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
        assigneeIds: [member.user.id],
      });
    expect(activityRes.status).toBe(201);
    const activityId = activityRes.body.id;

    const commentRes = await request(app)
      .post(`/api/projects/${project.id}/activities/${activityId}/comments`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({ text: "Avance del integrante" });
    expect(commentRes.status).toBe(201);

    const leaveRes = await request(app)
      .delete(`/api/projects/${project.id}/team/me`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(leaveRes.status).toBe(200);

    const row = await prisma.teamRequest.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: member.user.id } },
    });
    expect(row).toBeNull();

    const assignee = await prisma.activityAssignee.findUnique({
      where: { activityId_userId: { activityId, userId: member.user.id } },
    });
    expect(assignee).toBeNull();

    const comment = await prisma.activityComment.findUnique({ where: { id: commentRes.body.id } });
    expect(comment).not.toBeNull();

    expect(await isProjectMember(project.id, member.user.id)).toBe(false);
  });

  it("lets the owner remove a member, with the same unassign effect", async () => {
    const owner = await registerUser("STUDENT", "Owner Remove Member");
    const member = await registerUser("STUDENT", "Remove Member");
    const project = await createPublishedProject(owner.token);

    const joinRes = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${member.token}`)
      .send({});
    await request(app)
      .patch(`/api/team-requests/${joinRes.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });

    const activityRes = await request(app)
      .post(`/api/projects/${project.id}/activities`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({
        title: "Tarea del integrante",
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
        assigneeIds: [member.user.id],
      });
    const activityId = activityRes.body.id;

    const removeRes = await request(app)
      .delete(`/api/projects/${project.id}/team/${member.user.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(removeRes.status).toBe(200);

    const row = await prisma.teamRequest.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: member.user.id } },
    });
    expect(row).toBeNull();

    const assignee = await prisma.activityAssignee.findUnique({
      where: { activityId_userId: { activityId, userId: member.user.id } },
    });
    expect(assignee).toBeNull();

    // A non-owner can't remove other members.
    const other = await registerUser("STUDENT", "Remove Member Other");
    const secondMemberJoin = await request(app)
      .post(`/api/projects/${project.id}/team-requests`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({});
    await request(app)
      .patch(`/api/team-requests/${secondMemberJoin.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ status: "ACCEPTED" });

    const forbiddenRemove = await request(app)
      .delete(`/api/projects/${project.id}/team/${other.user.id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(forbiddenRemove.status).toBe(403);
  });

  it("lets an evaluator unlink themself and the owner unlink an evaluator, clearing the right slot", async () => {
    const owner = await registerUser("STUDENT", "Owner Unlink Evaluator");
    const teacher = await registerUser("TEACHER", "Unlink Evaluator Teacher");
    const project = await createProjectWithAcceptedEvaluator(owner.token, teacher.token, teacher.user.id);

    const leaveRes = await request(app)
      .delete(`/api/projects/${project.id}/team/me`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(leaveRes.status).toBe(200);

    const afterLeave = await request(app)
      .get(`/api/projects/${project.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(afterLeave.body.teacherId).toBeNull();

    const row = await prisma.teamRequest.findUnique({
      where: { projectId_userId: { projectId: project.id, userId: teacher.user.id } },
    });
    expect(row).toBeNull();

    // Owner-initiated unlink of a different evaluator (organization slot).
    const organization = await registerUser("ORGANIZATION", "Unlink Evaluator Org");
    const projectWithOrg = await createProjectWithAcceptedEvaluator(
      owner.token,
      organization.token,
      organization.user.id,
    );

    const removeRes = await request(app)
      .delete(`/api/projects/${projectWithOrg.id}/team/${organization.user.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(removeRes.status).toBe(200);

    const afterRemove = await request(app)
      .get(`/api/projects/${projectWithOrg.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(afterRemove.body.organizationId).toBeNull();
  });

  it("blocks both delete endpoints on an archived project", async () => {
    const owner = await registerUser("STUDENT", "Owner Archived Delete");
    const member = await registerUser("STUDENT", "Archived Delete Member");
    const project = await createPublishedProject(owner.token);

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

    const leaveRes = await request(app)
      .delete(`/api/projects/${project.id}/team/me`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(leaveRes.status).toBe(409);

    const removeRes = await request(app)
      .delete(`/api/projects/${project.id}/team/${member.user.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(removeRes.status).toBe(409);
  });

  it("doesn't let the owner leave their own project", async () => {
    const owner = await registerUser("STUDENT", "Owner No Leave Self");
    const project = await createPublishedProject(owner.token);

    const leaveRes = await request(app)
      .delete(`/api/projects/${project.id}/team/me`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(leaveRes.status).toBe(409);
  });
});
