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

describe("post likes", () => {
  it("lets an authenticated user like a feed post and reflects the count/flag on GET /api/feed", async () => {
    const owner = await registerUser("STUDENT", "Likes Owner");
    const liker = await registerUser("STUDENT", "Likes Liker");
    const project = await createPublishedProject(owner.token);
    const update = await postToFeed(owner.token, project.id, `Avance con like ${Date.now()}`);

    const likeRes = await request(app)
      .post(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);
    expect(likeRes.status).toBe(201);
    expect(likeRes.body).toEqual({ liked: true });

    const feedAsLikerRes = await request(app)
      .get("/api/feed")
      .set("Authorization", `Bearer ${liker.token}`);
    const entryAsLiker = feedAsLikerRes.body.find((e: any) => e.id === update.id);
    expect(entryAsLiker.likeCount).toBe(1);
    expect(entryAsLiker.likedByMe).toBe(true);

    const feedAnonRes = await request(app).get("/api/feed");
    const entryAnon = feedAnonRes.body.find((e: any) => e.id === update.id);
    expect(entryAnon.likeCount).toBe(1);
    expect(entryAnon.likedByMe).toBe(false);
  });

  it("rejects a double like with 409", async () => {
    const owner = await registerUser("STUDENT", "Likes Double Owner");
    const liker = await registerUser("STUDENT", "Likes Double Liker");
    const project = await createPublishedProject(owner.token);
    const update = await postToFeed(owner.token, project.id, `Avance doble like ${Date.now()}`);

    await request(app)
      .post(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);

    const secondRes = await request(app)
      .post(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.message).toBe("Ya te gusta esta publicación.");
  });

  it("unlikes a post, dropping the count back to 0", async () => {
    const owner = await registerUser("STUDENT", "Likes Unlike Owner");
    const liker = await registerUser("STUDENT", "Likes Unlike Liker");
    const project = await createPublishedProject(owner.token);
    const update = await postToFeed(owner.token, project.id, `Avance unlike ${Date.now()}`);

    await request(app)
      .post(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);

    const unlikeRes = await request(app)
      .delete(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);
    expect(unlikeRes.status).toBe(200);
    expect(unlikeRes.body).toEqual({ liked: false });

    const feedRes = await request(app).get("/api/feed");
    const entry = feedRes.body.find((e: any) => e.id === update.id);
    expect(entry.likeCount).toBe(0);
    expect(entry.likedByMe).toBe(false);
  });

  it("returns 404 when unliking a post that was never liked", async () => {
    const owner = await registerUser("STUDENT", "Likes NotLiked Owner");
    const other = await registerUser("STUDENT", "Likes NotLiked Other");
    const project = await createPublishedProject(owner.token);
    const update = await postToFeed(owner.token, project.id, `Avance sin like ${Date.now()}`);

    const res = await request(app)
      .delete(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${other.token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("No le habías dado me gusta a esta publicación.");
  });

  it("returns 404 when liking a post whose project is PRIVATE", async () => {
    const owner = await registerUser("STUDENT", "Likes Private Owner");
    const liker = await registerUser("STUDENT", "Likes Private Liker");
    const project = await createPublishedProject(owner.token, { visibility: "PRIVATE" });
    const update = await postToFeed(owner.token, project.id, `Avance privado ${Date.now()}`);

    const res = await request(app)
      .post(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Publicación no encontrada.");
  });

  it("returns 404 when liking a progress update that was never posted to the feed", async () => {
    const owner = await registerUser("STUDENT", "Likes NotFeed Owner");
    const liker = await registerUser("STUDENT", "Likes NotFeed Liker");
    const project = await createPublishedProject(owner.token);

    const notFeedRes = await request(app)
      .post(`/api/projects/${project.id}/progress-updates`)
      .set("Authorization", `Bearer ${owner.token}`)
      .send({ text: `Avance no feed ${Date.now()}` });
    expect(notFeedRes.status).toBe(201);

    const res = await request(app)
      .post(`/api/feed/${notFeedRes.body.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Publicación no encontrada.");
  });

  it("rejects an anonymous like attempt with 401", async () => {
    const owner = await registerUser("STUDENT", "Likes Anon Owner");
    const project = await createPublishedProject(owner.token);
    const update = await postToFeed(owner.token, project.id, `Avance anon ${Date.now()}`);

    const res = await request(app).post(`/api/feed/${update.id}/like`);
    expect(res.status).toBe(401);
  });

  it("notifies the post's author when someone else likes it, but not when the author likes their own post", async () => {
    const owner = await registerUser("STUDENT", "Likes Notify Owner");
    const liker = await registerUser("STUDENT", "Likes Notify Liker");
    const project = await createPublishedProject(owner.token);
    const update = await postToFeed(owner.token, project.id, `Avance notificado ${Date.now()}`);

    await request(app)
      .post(`/api/feed/${update.id}/like`)
      .set("Authorization", `Bearer ${liker.token}`);

    const notifications = await prisma.notification.findMany({
      where: { userId: owner.user.id, type: "POST_LIKED" },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain(liker.user.name);
    expect(notifications[0].link).toBe(`/proyectos/${project.id}`);

    const update2 = await postToFeed(owner.token, project.id, `Avance propio ${Date.now()}`);
    await request(app)
      .post(`/api/feed/${update2.id}/like`)
      .set("Authorization", `Bearer ${owner.token}`);

    const selfNotifications = await prisma.notification.findMany({
      where: { userId: owner.user.id, type: "POST_LIKED", link: `/proyectos/${project.id}` },
    });
    // Still just the one notification from the other user's like above —
    // liking your own post creates no notification.
    expect(selfNotifications).toHaveLength(1);
  });
});
