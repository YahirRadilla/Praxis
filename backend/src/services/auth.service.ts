import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import type { User } from "@prisma/client";
import {
  createUser,
  findUserByEmail,
  findUserById,
  markUserVerified,
} from "../repositories/user.repository";
import { toPublicUser } from "./user.service";
import { HttpError } from "../types/http-error";
import type { AppJwtPayload } from "../types/auth";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "7d";

// Derived from the demo accounts in backend/prisma/seed.ts; extend here as
// new institutions get onboarded.
export const INSTITUTIONAL_EMAIL_DOMAINS = [
  "alumnos.udg.mx",
  "udg.mx",
  "alumnos.uabcs.mx",
  "uabcs.mx",
];

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET no está definido. Agregalo a backend/.env antes de levantar el servidor.",
    );
  }
  return secret;
}

function signToken(user: Pick<User, "id" | "accountType">): string {
  const payload: AppJwtPayload = { sub: user.id, accountType: user.accountType };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_EXPIRES_IN });
}

export async function register(input: RegisterInput) {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new HttpError(409, "Ya existe una cuenta registrada con ese correo.");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const user = await createUser({
    email: input.email,
    passwordHash,
    name: input.name,
    accountType: input.accountType,
  });

  return { user: toPublicUser(user), token: signToken(user) };
}

function getGoogleClientId(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new HttpError(
      500,
      "GOOGLE_CLIENT_ID no está definido. Agregalo a backend/.env antes de usar la verificación con Google.",
    );
  }
  return clientId;
}

/** Verifies the ID token's signature/audience/issuer against Google's own
 * keys — never trust an unverified JWT payload. */
async function verifyGoogleIdTokenPayload(idToken: string) {
  const clientId = getGoogleClientId();
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken, audience: clientId });
  const payload = ticket.getPayload();
  if (!payload) {
    throw new HttpError(400, "No se pudo verificar el token de Google.");
  }
  return payload;
}

export async function verifyAccountWithGoogle(userId: number, idToken: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  if (user.accountType !== "STUDENT" && user.accountType !== "TEACHER") {
    throw new HttpError(
      400,
      "Solo las cuentas de estudiante o docente pueden verificarse con un correo institucional.",
    );
  }

  if (user.verified) {
    return toPublicUser(user);
  }

  const payload = await verifyGoogleIdTokenPayload(idToken);

  if (payload.email_verified !== true) {
    throw new HttpError(400, "Google no confirma que ese correo esté verificado.");
  }

  const googleEmail = payload.email?.toLowerCase();
  if (!googleEmail || googleEmail !== user.email.toLowerCase()) {
    throw new HttpError(
      400,
      "Debes iniciar sesión con la cuenta de Google que corresponde a tu correo registrado en Praxis, no con otra cuenta.",
    );
  }

  const domain = googleEmail.split("@")[1];
  if (!domain || !INSTITUTIONAL_EMAIL_DOMAINS.includes(domain)) {
    throw new HttpError(400, "Ese correo no pertenece a un dominio institucional reconocido.");
  }

  const updatedUser = await markUserVerified(user.id);
  return toPublicUser(updatedUser);
}

export async function login(input: LoginInput) {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, "Correo o contraseña incorrectos.");
  }

  return { user: toPublicUser(user), token: signToken(user) };
}
