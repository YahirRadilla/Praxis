import type { Request, Response, NextFunction } from "express";
import {
  createClassGroupSchema,
  searchClassGroupsQuerySchema,
  updateClassGroupSchema,
} from "../schemas/class-group.schema";
import * as classGroupService from "../services/class-group.service";

export async function createClassGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createClassGroupSchema.parse(req.body);
    const classGroup = await classGroupService.createClassGroup(
      req.user!.sub,
      req.user!.accountType,
      input,
    );
    res.status(201).json(classGroup);
  } catch (error) {
    next(error);
  }
}

export async function updateClassGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateClassGroupSchema.parse(req.body);
    const classGroup = await classGroupService.updateClassGroup(
      Number(req.params.id),
      req.user!.sub,
      input,
    );
    res.status(200).json(classGroup);
  } catch (error) {
    next(error);
  }
}

export async function searchClassGroupsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = searchClassGroupsQuerySchema.parse(req.query);
    const classGroups = await classGroupService.searchClassGroups(query);
    res.status(200).json(classGroups);
  } catch (error) {
    next(error);
  }
}

export async function getClassGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const classGroup = await classGroupService.getClassGroup(
      Number(req.params.id),
      req.user?.sub,
      req.user?.accountType,
    );
    res.status(200).json(classGroup);
  } catch (error) {
    next(error);
  }
}

export async function listMyClassGroupsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const classGroups = await classGroupService.listMyClassGroups(req.user!.sub);
    res.status(200).json(classGroups);
  } catch (error) {
    next(error);
  }
}

export async function listJoinedClassGroupsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const classGroups = await classGroupService.listJoinedClassGroups(req.user!.sub);
    res.status(200).json(classGroups);
  } catch (error) {
    next(error);
  }
}

export async function joinClassGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const membership = await classGroupService.joinClassGroup(
      Number(req.params.id),
      req.user!.sub,
      req.user!.accountType,
    );
    res.status(201).json(membership);
  } catch (error) {
    next(error);
  }
}

export async function leaveClassGroupHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await classGroupService.leaveClassGroup(Number(req.params.id), req.user!.sub);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function listClassGroupMembersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const members = await classGroupService.listClassGroupMembers(
      Number(req.params.id),
      req.user!.sub,
    );
    res.status(200).json(members);
  } catch (error) {
    next(error);
  }
}

export async function removeClassGroupMemberHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await classGroupService.removeClassGroupMember(
      Number(req.params.id),
      req.user!.sub,
      Number(req.params.userId),
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
