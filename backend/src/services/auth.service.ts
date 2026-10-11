import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { createUser, findUserByEmail } from "../repositories/user.repository";
import { toPublicUser } from "./user.service";
import { HttpError } from "../types/http-error";
import type { AppJwtPayload } from "../types/auth";
import type { LoginInput, RegisterInput } from "../schemas/auth.schema";

const SALT_ROUNDS = 10;
const TOKEN_EXPIRES_IN = "7d";

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
