import type { Request, Response, NextFunction } from "express";
import {
  createTeamRequestSchema,
  inviteToTeamSchema,
  respondTeamRequestSchema,
} from "../schemas/team-request.schema";
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

export async function inviteToTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = inviteToTeamSchema.parse(req.body);
    const request = await teamRequestService.inviteToTeam(
      Number(req.params.projectId),
      req.user!.sub,
      input.userId,
      input.purpose,
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

export async function listReceivedInvitesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const invites = await teamRequestService.listReceivedInvites(req.user!.sub);
    res.status(200).json(invites);
  } catch (error) {
    next(error);
  }
}

export async function listTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const team = await teamRequestService.listTeam(Number(req.params.projectId), req.user?.sub);
    res.status(200).json(team);
  } catch (error) {
    next(error);
  }
}

export async function leaveTeamHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await teamRequestService.leaveTeam(Number(req.params.projectId), req.user!.sub);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function removeTeamMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await teamRequestService.removeTeamMember(
      Number(req.params.projectId),
      req.user!.sub,
      Number(req.params.userId),
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
