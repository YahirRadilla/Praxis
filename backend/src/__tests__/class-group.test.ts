import { describe, expect, it } from "vitest";
import {
  app,
  createClassGroupFor,
  createProjectFor,
  joinClassGroupFor,
  registerUser,
  request,
} from "./helpers";

describe("class groups: creation and ownership", () => {
  it("lets a TEACHER create a class group", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Create ClassGroup");
    const created = await createClassGroupFor(teacher.token, {
      name: "Ingeniería de Software 6to TM",
      description: "Grupo de 6to semestre.",
    });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe("Ingeniería de Software 6to TM");
    expect(created.body.teacher.id).toBe(teacher.user.id);
  });

  it("rejects class group creation from ORGANIZATION and STUDENT accounts", async () => {
    const organization = await registerUser("ORGANIZATION", "Org ClassGroup Reject");
    const student = await registerUser("STUDENT", "Student ClassGroup Reject");

    const orgRes = await createClassGroupFor(organization.token);
    expect(orgRes.status).toBe(403);

    const studentRes = await createClassGroupFor(student.token);
    expect(studentRes.status).toBe(403);
  });

  it("requires authentication to create a class group", async () => {
    const res = await request(app)
      .post("/api/class-groups")
      .send({ name: "Sin token", description: "Debe fallar" });
    expect(res.status).toBe(401);
  });

  it("lets the owning teacher PATCH name/description, but not another teacher", async () => {
    const owner = await registerUser("TEACHER", "Teacher Patch Owner");
    const other = await registerUser("TEACHER", "Teacher Patch Other");
    const created = await createClassGroupFor(owner.token);
    expect(created.status).toBe(201);

    const forbidden = await request(app)
      .patch(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ name: "Intento ajeno" });
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .patch(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ name: "Nombre actualizado" });
    expect(allowed.status).toBe(200);
    expect(allowed.body.name).toBe("Nombre actualizado");
  });

  it("404s a PATCH on a class group that doesn't exist", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Patch Missing");
    const res = await request(app)
      .patch("/api/class-groups/999999")
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ name: "No existe" });
    expect(res.status).toBe(404);
  });
});

describe("GET /api/class-groups: public preview search", () => {
  it("is reachable anonymously and matches by name/description, case-insensitively", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Search ClassGroup");
    const unique = Date.now();
    await createClassGroupFor(teacher.token, {
      name: `Programación Avanzada ${unique}`,
      description: "Grupo de búsqueda.",
    });
    await createClassGroupFor(teacher.token, {
      name: `Bases de Datos ${unique}`,
      description: "Otro grupo distinto.",
    });

    const res = await request(app).get("/api/class-groups").query({ q: "programación" });
    expect(res.status).toBe(200);
    const names = res.body.map((g: any) => g.name as string);
    expect(names.some((n: string) => n.includes(`Programación Avanzada ${unique}`))).toBe(true);
    expect(names.some((n: string) => n.includes(`Bases de Datos ${unique}`))).toBe(false);
  });

  it("returns preview-tier fields only: no resources/projects/members, no teacher email", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Search Preview");
    const unique = Date.now();
    await createClassGroupFor(teacher.token, { name: `Grupo Preview ${unique}` });

    const res = await request(app).get("/api/class-groups").query({ q: `Grupo Preview ${unique}` });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    const [group] = res.body;
    expect(group.resources).toBeUndefined();
    expect(group.projects).toBeUndefined();
    expect(group.members).toBeUndefined();
    expect(group.teacher.email).toBeUndefined();
    expect(group._count).toEqual({ resources: 0, members: 0, projects: 0 });
  });
});

describe("GET /api/class-groups/:id: visibility tiers", () => {
  it("preview tier: anonymous and non-member viewers never get resources/projects/members keys", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Tier Preview");
    const outsider = await registerUser("STUDENT", "Outsider Tier Preview");
    const created = await createClassGroupFor(teacher.token);

    const anonRes = await request(app).get(`/api/class-groups/${created.body.id}`);
    expect(anonRes.status).toBe(200);
    expect(anonRes.body.teacher.email).toBeUndefined();
    expect(anonRes.body.teacher.id).toBe(teacher.user.id);
    expect(anonRes.body.resources).toBeUndefined();
    expect(anonRes.body.projects).toBeUndefined();
    expect(anonRes.body.members).toBeUndefined();
    expect(anonRes.body.viewer).toBeUndefined();

    const outsiderRes = await request(app)
      .get(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${outsider.token}`);
    expect(outsiderRes.status).toBe(200);
    expect(outsiderRes.body.teacher.email).toBeUndefined();
    expect(outsiderRes.body.resources).toBeUndefined();
    expect(outsiderRes.body.projects).toBeUndefined();
    expect(outsiderRes.body.members).toBeUndefined();
    expect(outsiderRes.body.viewer).toEqual({ isOwner: false, isMember: false, canJoin: true });
  });

  it("preview tier: a non-STUDENT outsider (e.g. another TEACHER) can't join", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Tier Preview Other");
    const otherTeacher = await registerUser("TEACHER", "Other Teacher Tier Preview");
    const created = await createClassGroupFor(teacher.token);

    const res = await request(app)
      .get(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${otherTeacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.viewer).toEqual({ isOwner: false, isMember: false, canJoin: false });
  });

  it("member tier: a joined student sees resources + public/own projects, but not the member list or teacher email", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Tier Member");
    const member = await registerUser("STUDENT", "Student Tier Member");
    const created = await createClassGroupFor(teacher.token);
    const joined = await joinClassGroupFor(member.token, created.body.id);
    expect(joined.status).toBe(201);

    const res = await request(app)
      .get(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(res.status).toBe(200);
    expect(res.body.teacher.email).toBeUndefined();
    expect(res.body.resources).toEqual([]);
    expect(res.body.projects).toEqual([]);
    expect(res.body.members).toBeUndefined();
    expect(res.body.viewer).toEqual({ isOwner: false, isMember: true, canJoin: false });
  });

  it("member tier: shows public projects from anyone, and the member's own projects even if private, but not other members' private projects", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Tier Member Projects");
    const member = await registerUser("STUDENT", "Student Tier Member Projects");
    const otherMember = await registerUser("STUDENT", "Other Student Tier Member Projects");
    const created = await createClassGroupFor(teacher.token);
    await joinClassGroupFor(member.token, created.body.id);
    await joinClassGroupFor(otherMember.token, created.body.id);

    const ownPrivate = await createProjectFor(member.token, {
      classGroupId: created.body.id,
      visibility: "PRIVATE",
    });
    expect(ownPrivate.status).toBe(201);
    const othersPrivate = await createProjectFor(otherMember.token, {
      classGroupId: created.body.id,
      visibility: "PRIVATE",
    });
    expect(othersPrivate.status).toBe(201);
    const othersPublic = await createProjectFor(otherMember.token, {
      classGroupId: created.body.id,
      visibility: "PUBLIC",
    });
    expect(othersPublic.status).toBe(201);

    const res = await request(app)
      .get(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${member.token}`);
    expect(res.status).toBe(200);
    const ids = res.body.projects.map((p: any) => p.id);
    expect(ids).toContain(ownPrivate.body.id);
    expect(ids).toContain(othersPublic.body.id);
    expect(ids).not.toContain(othersPrivate.body.id);
  });

  it("owner tier: the owning teacher sees every linked project (any visibility) plus the member list with emails", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Tier Owner");
    const member = await registerUser("STUDENT", "Student Tier Owner");
    const created = await createClassGroupFor(teacher.token);
    await joinClassGroupFor(member.token, created.body.id);

    const privateProject = await createProjectFor(member.token, {
      classGroupId: created.body.id,
      visibility: "PRIVATE",
    });
    expect(privateProject.status).toBe(201);

    const res = await request(app)
      .get(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(res.status).toBe(200);
    expect(res.body.teacher.email).toBe(teacher.user.email);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0]).toEqual({
      id: privateProject.body.id,
      name: privateProject.body.name,
      visibility: "PRIVATE",
      archived: false,
      bannerUrl: null,
    });
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].user.email).toBe(member.user.email);
    expect(res.body.viewer).toEqual({ isOwner: true, isMember: false, canJoin: false });
  });

  it("404s for a class group id that doesn't exist", async () => {
    const res = await request(app).get("/api/class-groups/999999");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/class-groups/mine", () => {
  it("returns only the caller's own class groups", async () => {
    const teacherA = await registerUser("TEACHER", "Teacher Mine A");
    const teacherB = await registerUser("TEACHER", "Teacher Mine B");
    const createdA = await createClassGroupFor(teacherA.token, { name: `Mine A ${Date.now()}` });
    await createClassGroupFor(teacherB.token, { name: `Mine B ${Date.now()}` });

    const res = await request(app)
      .get("/api/class-groups/mine")
      .set("Authorization", `Bearer ${teacherA.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(createdA.body.id);
  });

  it("returns an empty list for a non-teacher account", async () => {
    const student = await registerUser("STUDENT", "Student Mine Empty");
    const res = await request(app)
      .get("/api/class-groups/mine")
      .set("Authorization", `Bearer ${student.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("class group membership: self-serve join/leave", () => {
  it("lets a STUDENT self-join, 409s on a duplicate join, and lets them leave", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Membership Join");
    const student = await registerUser("STUDENT", "Student Membership Join");
    const created = await createClassGroupFor(teacher.token);

    const joined = await joinClassGroupFor(student.token, created.body.id);
    expect(joined.status).toBe(201);

    const duplicate = await joinClassGroupFor(student.token, created.body.id);
    expect(duplicate.status).toBe(409);

    const left = await request(app)
      .delete(`/api/class-groups/${created.body.id}/members/me`)
      .set("Authorization", `Bearer ${student.token}`);
    expect(left.status).toBe(200);

    const leftAgain = await request(app)
      .delete(`/api/class-groups/${created.body.id}/members/me`)
      .set("Authorization", `Bearer ${student.token}`);
    expect(leftAgain.status).toBe(404);
  });

  it("blocks the owning teacher from joining their own group", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Membership Self");
    const created = await createClassGroupFor(teacher.token);

    const res = await joinClassGroupFor(teacher.token, created.body.id);
    expect(res.status).toBe(400);
  });

  it("blocks non-STUDENT accounts from joining", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Membership NonStudent");
    const otherTeacher = await registerUser("TEACHER", "Other Teacher Membership NonStudent");
    const organization = await registerUser("ORGANIZATION", "Org Membership NonStudent");
    const created = await createClassGroupFor(teacher.token);

    const teacherRes = await joinClassGroupFor(otherTeacher.token, created.body.id);
    expect(teacherRes.status).toBe(403);

    const orgRes = await joinClassGroupFor(organization.token, created.body.id);
    expect(orgRes.status).toBe(403);
  });

  it("requires authentication to join", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Membership Auth");
    const created = await createClassGroupFor(teacher.token);

    const res = await request(app).post(`/api/class-groups/${created.body.id}/members`);
    expect(res.status).toBe(401);
  });
});

describe("class group membership: owner-only list/removal", () => {
  it("lets the owning teacher list members with email, but blocks a non-owner", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Membership List");
    const other = await registerUser("TEACHER", "Other Teacher Membership List");
    const student = await registerUser("STUDENT", "Student Membership List");
    const created = await createClassGroupFor(teacher.token);
    await joinClassGroupFor(student.token, created.body.id);

    const forbidden = await request(app)
      .get(`/api/class-groups/${created.body.id}/members`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(forbidden.status).toBe(403);

    const allowed = await request(app)
      .get(`/api/class-groups/${created.body.id}/members`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(allowed.status).toBe(200);
    expect(allowed.body).toHaveLength(1);
    expect(allowed.body[0].user.email).toBe(student.user.email);
  });

  it("lets the owning teacher remove a member, 404s if the target isn't a member, 403s for a non-owner", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Membership Remove");
    const other = await registerUser("TEACHER", "Other Teacher Membership Remove");
    const student = await registerUser("STUDENT", "Student Membership Remove");
    const created = await createClassGroupFor(teacher.token);
    await joinClassGroupFor(student.token, created.body.id);

    const forbidden = await request(app)
      .delete(`/api/class-groups/${created.body.id}/members/${student.user.id}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(forbidden.status).toBe(403);

    const removed = await request(app)
      .delete(`/api/class-groups/${created.body.id}/members/${student.user.id}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(removed.status).toBe(200);

    const removedAgain = await request(app)
      .delete(`/api/class-groups/${created.body.id}/members/${student.user.id}`)
      .set("Authorization", `Bearer ${teacher.token}`);
    expect(removedAgain.status).toBe(404);
  });
});

describe("GET /api/class-groups/joined", () => {
  it("returns only the caller's joined class groups, not every class group", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Joined List");
    const student = await registerUser("STUDENT", "Student Joined List");
    const joinedGroup = await createClassGroupFor(teacher.token, { name: `Joined ${Date.now()}` });
    await createClassGroupFor(teacher.token, { name: `Not joined ${Date.now()}` });
    await joinClassGroupFor(student.token, joinedGroup.body.id);

    const res = await request(app)
      .get("/api/class-groups/joined")
      .set("Authorization", `Bearer ${student.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(joinedGroup.body.id);
  });

  it("requires authentication", async () => {
    const res = await request(app).get("/api/class-groups/joined");
    expect(res.status).toBe(401);
  });
});

describe("class group resources (anexos)", () => {
  it("lets the owning teacher add and delete a resource, but blocks another teacher", async () => {
    const owner = await registerUser("TEACHER", "Teacher Resource Owner");
    const other = await registerUser("TEACHER", "Teacher Resource Other");
    const classGroup = await createClassGroupFor(owner.token);

    const forbiddenAdd = await request(app)
      .post(`/api/class-groups/${classGroup.body.id}/resources`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ type: "LINK", url: "https://example.com", label: "Intento ajeno" });
    expect(forbiddenAdd.status).toBe(403);

    const added = await request(app)
      .post(`/api/class-groups/${classGroup.body.id}/resources`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ type: "LINK", url: "https://example.com", label: "Temario" });
    expect(added.status).toBe(201);
    expect(added.body.label).toBe("Temario");

    const forbiddenDelete = await request(app)
      .delete(`/api/class-groups/${classGroup.body.id}/resources/${added.body.id}`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(forbiddenDelete.status).toBe(403);

    const deleted = await request(app)
      .delete(`/api/class-groups/${classGroup.body.id}/resources/${added.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(deleted.status).toBe(204);

    const res = await request(app)
      .get(`/api/class-groups/${classGroup.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(res.body.resources).toEqual([]);
  });
});

describe("linking a project to a class group requires membership (or ownership)", () => {
  it("403s creating a project with a classGroupId the caller hasn't joined, and succeeds once they've joined", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Project Link Membership");
    const owner = await registerUser("STUDENT", "Owner Project Link Membership");
    const classGroup = await createClassGroupFor(teacher.token);

    const blocked = await createProjectFor(owner.token, { classGroupId: classGroup.body.id });
    expect(blocked.status).toBe(403);

    const joined = await joinClassGroupFor(owner.token, classGroup.body.id);
    expect(joined.status).toBe(201);

    const project = await createProjectFor(owner.token, { classGroupId: classGroup.body.id });
    expect(project.status).toBe(201);
    expect(project.body.classGroup).toEqual({ id: classGroup.body.id, name: classGroup.body.name });

    const getRes = await request(app)
      .get(`/api/projects/${project.body.id}`)
      .set("Authorization", `Bearer ${owner.token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.classGroup).toEqual({ id: classGroup.body.id, name: classGroup.body.name });
  });

  it("lets the owning teacher link a project without joining their own group", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Project Link Owner");
    const classGroup = await createClassGroupFor(teacher.token);

    const project = await createProjectFor(teacher.token, { classGroupId: classGroup.body.id });
    expect(project.status).toBe(201);
  });

  it("404s when creating a project with a classGroupId that doesn't exist", async () => {
    const owner = await registerUser("STUDENT", "Owner Project Link Missing");
    const project = await createProjectFor(owner.token, { classGroupId: 999999 });
    expect(project.status).toBe(404);
  });
});

describe("class group bannerUrl: PATCH /api/class-groups/:id", () => {
  it("lets the owning teacher PATCH bannerUrl", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Banner Owner");
    const created = await createClassGroupFor(teacher.token);

    const res = await request(app)
      .patch(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ bannerUrl: "https://example.com/banner.png" });
    expect(res.status).toBe(200);
    expect(res.body.bannerUrl).toBe("https://example.com/banner.png");
  });

  it("rejects a PATCH from a non-owner teacher with 403", async () => {
    const owner = await registerUser("TEACHER", "Teacher Banner Owner2");
    const other = await registerUser("TEACHER", "Teacher Banner Intruder");
    const created = await createClassGroupFor(owner.token);

    const res = await request(app)
      .patch(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${other.token}`)
      .send({ bannerUrl: "https://example.com/banner.png" });
    expect(res.status).toBe(403);
  });

  it("includes bannerUrl in an anonymous/public preview GET and in a search response", async () => {
    const teacher = await registerUser("TEACHER", "Teacher Banner Preview");
    const unique = Date.now();
    const created = await createClassGroupFor(teacher.token, { name: `Grupo Banner ${unique}` });

    await request(app)
      .patch(`/api/class-groups/${created.body.id}`)
      .set("Authorization", `Bearer ${teacher.token}`)
      .send({ bannerUrl: "https://example.com/banner.png" });

    const previewRes = await request(app).get(`/api/class-groups/${created.body.id}`);
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.bannerUrl).toBe("https://example.com/banner.png");

    const searchRes = await request(app)
      .get("/api/class-groups")
      .query({ q: `Grupo Banner ${unique}` });
    expect(searchRes.status).toBe(200);
    expect(searchRes.body).toHaveLength(1);
    expect(searchRes.body[0].bannerUrl).toBe("https://example.com/banner.png");
  });
});
