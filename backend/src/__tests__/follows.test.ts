import { describe, expect, it } from "vitest";
import { app, prisma, registerUser, request } from "./helpers";

describe("follows", () => {
  it("follows a user, updating both sides' counts and followedByMe", async () => {
    const follower = await registerUser("STUDENT", "Follows Follower");
    const target = await registerUser("STUDENT", "Follows Target");

    const followRes = await request(app)
      .post(`/api/users/${target.user.id}/follow`)
      .set("Authorization", `Bearer ${follower.token}`);
    expect(followRes.status).toBe(201);
    expect(followRes.body).toEqual({ following: true });

    const targetProfileRes = await request(app)
      .get(`/api/users/${target.user.id}`)
      .set("Authorization", `Bearer ${follower.token}`);
    expect(targetProfileRes.status).toBe(200);
    expect(targetProfileRes.body.followerCount).toBe(1);
    expect(targetProfileRes.body.followedByMe).toBe(true);

    const followerProfileRes = await request(app).get(`/api/users/${follower.user.id}`);
    expect(followerProfileRes.status).toBe(200);
    expect(followerProfileRes.body.followingCount).toBe(1);
  });

  it("rejects following yourself with 400", async () => {
    const user = await registerUser("STUDENT", "Follows Self");
    const res = await request(app)
      .post(`/api/users/${user.user.id}/follow`)
      .set("Authorization", `Bearer ${user.token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("No puedes seguirte a ti mismo.");
  });

  it("returns 404 when following an unknown user", async () => {
    const follower = await registerUser("STUDENT", "Follows Unknown");
    const res = await request(app)
      .post("/api/users/999999999/follow")
      .set("Authorization", `Bearer ${follower.token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Usuario no encontrado.");
  });

  it("rejects a double follow with 409", async () => {
    const follower = await registerUser("STUDENT", "Follows Double Follower");
    const target = await registerUser("STUDENT", "Follows Double Target");

    await request(app)
      .post(`/api/users/${target.user.id}/follow`)
      .set("Authorization", `Bearer ${follower.token}`);
    const secondRes = await request(app)
      .post(`/api/users/${target.user.id}/follow`)
      .set("Authorization", `Bearer ${follower.token}`);
    expect(secondRes.status).toBe(409);
    expect(secondRes.body.message).toBe("Ya sigues a este usuario.");
  });

  it("unfollows a user", async () => {
    const follower = await registerUser("STUDENT", "Follows Unfollow Follower");
    const target = await registerUser("STUDENT", "Follows Unfollow Target");

    await request(app)
      .post(`/api/users/${target.user.id}/follow`)
      .set("Authorization", `Bearer ${follower.token}`);

    const unfollowRes = await request(app)
      .delete(`/api/users/${target.user.id}/follow`)
      .set("Authorization", `Bearer ${follower.token}`);
    expect(unfollowRes.status).toBe(200);
    expect(unfollowRes.body).toEqual({ following: false });

    const targetProfileRes = await request(app).get(`/api/users/${target.user.id}`);
    expect(targetProfileRes.body.followerCount).toBe(0);
  });

  it("returns 404 when unfollowing a user you don't follow", async () => {
    const follower = await registerUser("STUDENT", "Follows NotFollowing Follower");
    const target = await registerUser("STUDENT", "Follows NotFollowing Target");

    const res = await request(app)
      .delete(`/api/users/${target.user.id}/follow`)
      .set("Authorization", `Bearer ${follower.token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe("No seguías a este usuario.");
  });

  it("rejects an anonymous follow attempt with 401", async () => {
    const target = await registerUser("STUDENT", "Follows Anon Target");
    const res = await request(app).post(`/api/users/${target.user.id}/follow`);
    expect(res.status).toBe(401);
  });

  it("creates a NEW_FOLLOWER notification for the followed user", async () => {
    const follower = await registerUser("STUDENT", "Follows Notify Follower");
    const target = await registerUser("STUDENT", "Follows Notify Target");

    await request(app)
      .post(`/api/users/${target.user.id}/follow`)
      .set("Authorization", `Bearer ${follower.token}`);

    const notifications = await prisma.notification.findMany({
      where: { userId: target.user.id, type: "NEW_FOLLOWER" },
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toContain(follower.user.name);
    expect(notifications[0].link).toBe(`/usuarios/${follower.user.id}`);
  });
});
