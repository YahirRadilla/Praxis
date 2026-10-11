import type { Request, Response, NextFunction } from "express";
import { createTeamRequestSchema, respondTeamRequestSchema } from "../schemas/team-request.schema";
import * as teamRequestService from "../services/team-request.service";

export async function requestToJoinHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createTeamRequestSchema.parse(req.body);
    const request = await teamRequestService.requestToJoin(
      Number(req.params.projectId),
      req.user!.sub,
      input,
    );
    res.status(201).json(request);
  } catch (error) {
    next(error);
  }
}

export async function respondToRequestHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = respondTeamRequestSchema.parse(req.body);
    const request = await teamRequestService.respondToRequest(
      Number(req.params.id),
      req.user!.sub,
      input.status,
    );
    res.status(200).json(request);
  } catch (error) {
    next(error);
  }
}

export async function listPendingRequestsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await teamRequestService.listPendingRequests(
      Number(req.params.projectId),
      req.user!.sub,
    );
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
}

export async function listReceivedRequestsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const requests = await teamRequestService.listReceivedRequests(req.user!.sub);
    res.status(200).json(requests);
  } catch (error) {
    next(error);
  }
}

export async function listTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await teamRequestService.listTeam(Number(req.params.projectId));
    res.status(200).json(team);
  } catch (error) {
    next(error);
  }
}
