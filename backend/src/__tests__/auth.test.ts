import { describe, expect, it } from "vitest";
import { app, request, uniqueEmail } from "./helpers";

describe("auth", () => {
  it("registers and logs in with the right password", async () => {
    const email = uniqueEmail("auth-ok");
    const registerRes = await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Auth Ok",
      accountType: "STUDENT",
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.token).toBeTruthy();
    expect(registerRes.body.user.email).toBe(email);

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "password123",
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();
    expect(loginRes.body.user.email).toBe(email);
  });

  it("rejects login with the wrong password", async () => {
    const email = uniqueEmail("auth-bad");
    await request(app).post("/api/auth/register").send({
      email,
      password: "password123",
      name: "Auth Bad",
      accountType: "STUDENT",
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email,
      password: "wrong-password",
    });
    expect(loginRes.status).toBe(401);
  });
});
