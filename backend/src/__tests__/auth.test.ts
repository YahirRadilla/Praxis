import { describe, expect, it, vi, beforeEach } from "vitest";
import { app, request, prisma, uniqueEmail } from "./helpers";

const verifyIdToken = vi.fn();

// Mocks the google-auth-library client so tests never hit Google's real
// servers: the service only ever calls `new OAuth2Client(...).verifyIdToken`,
// so stubbing that one method is enough to control every scenario.
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken })),
}));

// Set directly on process.env for the test run only (never written to any
// .env file) so the service's "missing GOOGLE_CLIENT_ID" guard doesn't fire.
process.env.GOOGLE_CLIENT_ID = "test-google-client-id";

function uniqueInstitutionalEmail(prefix: string, domain = "alumnos.uabcs.mx"): string {
  return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1_000_000)}@${domain}`;
}

function mockGooglePayload(payload: Record<string, unknown>) {
  verifyIdToken.mockResolvedValue({ getPayload: () => payload });
}

async function registerAt(email: string, accountType: string, name: string) {
  const res = await request(app).post("/api/auth/register").send({
    email,
    password: "password123",
    name,
    accountType,
  });
  if (res.status !== 201) {
    throw new Error(`Failed to register user: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token as string, user: res.body.user };
}

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

describe("POST /api/auth/verify-google", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("rejects a request with no auth token", async () => {
    const res = await request(app).post("/api/auth/verify-google").send({ idToken: "x" });
    expect(res.status).toBe(401);
  });

  it("sets verified: true when the Google email matches the registered institutional email", async () => {
    const email = uniqueInstitutionalEmail("ana");
    const { token, user } = await registerAt(email, "STUDENT", "Ana Estudiante");
    expect(user.verified).toBe(false);

    mockGooglePayload({ email, email_verified: true });

    const res = await request(app)
      .post("/api/auth/verify-google")
      .set("Authorization", `Bearer ${token}`)
      .send({ idToken: "valid-token" });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(res.body.verifiedAt).toBeTruthy();
    expect(res.body.passwordHash).toBeUndefined();
  });

  it("rejects accounts that are not STUDENT or TEACHER", async () => {
    const email = uniqueInstitutionalEmail("org");
    const { token } = await registerAt(email, "ORGANIZATION", "Fundación de Prueba");

    const res = await request(app)
      .post("/api/auth/verify-google")
      .set("Authorization", `Bearer ${token}`)
      .send({ idToken: "valid-token" });

    expect(res.status).toBe(400);
  });

  it("rejects when Google's email_verified claim is false", async () => {
    const email = uniqueInstitutionalEmail("luis");
    const { token } = await registerAt(email, "STUDENT", "Luis Estudiante");

    mockGooglePayload({ email, email_verified: false });

    const res = await request(app)
      .post("/api/auth/verify-google")
      .set("Authorization", `Bearer ${token}`)
      .send({ idToken: "valid-token" });

    expect(res.status).toBe(400);
  });

  it("rejects when the Google email doesn't match the logged-in user's own registered email", async () => {
    const email = uniqueInstitutionalEmail("carla");
    const { token } = await registerAt(email, "STUDENT", "Carla Estudiante");

    mockGooglePayload({ email: uniqueInstitutionalEmail("otra-persona"), email_verified: true });

    const res = await request(app)
      .post("/api/auth/verify-google")
      .set("Authorization", `Bearer ${token}`)
      .send({ idToken: "valid-token" });

    expect(res.status).toBe(400);
  });

  it("rejects a non-institutional email domain", async () => {
    const email = uniqueInstitutionalEmail("diego", "gmail.com");
    const { token } = await registerAt(email, "TEACHER", "Diego Docente");

    mockGooglePayload({ email, email_verified: true });

    const res = await request(app)
      .post("/api/auth/verify-google")
      .set("Authorization", `Bearer ${token}`)
      .send({ idToken: "valid-token" });

    expect(res.status).toBe(400);
  });

  it("is a no-op success when the account is already verified", async () => {
    const email = uniqueInstitutionalEmail("renata");
    const { token, user } = await registerAt(email, "TEACHER", "Renata Docente");
    await prisma.user.update({
      where: { id: user.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    const res = await request(app)
      .post("/api/auth/verify-google")
      .set("Authorization", `Bearer ${token}`)
      .send({ idToken: "irrelevant-token" });

    expect(res.status).toBe(200);
    expect(res.body.verified).toBe(true);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
