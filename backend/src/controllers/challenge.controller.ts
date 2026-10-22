import type { Request, Response, NextFunction } from "express";
import { createChallengeSchema, listChallengesQuerySchema } from "../schemas/challenge.schema";
import * as challengeService from "../services/challenge.service";

export async function createChallengeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createChallengeSchema.parse(req.body);
    const challenge = await challengeService.createChallenge(
      req.user!.sub,
      req.user!.accountType,
      input,
    );
    res.status(201).json(challenge);
  } catch (error) {
    next(error);
  }
}

export async function listChallengesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listChallengesQuerySchema.parse(req.query);
    const challenges = await challengeService.listChallenges(query);
    res.status(200).json(challenges);
  } catch (error) {
    next(error);
  }
}

export async function getChallengeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const challenge = await challengeService.getChallenge(Number(req.params.id));
    res.status(200).json(challenge);
  } catch (error) {
    next(error);
  }
}
