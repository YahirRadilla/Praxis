import type { Request, Response, NextFunction } from "express";
import {
  listConversationsQuerySchema,
  respondConversationSchema,
  sendMessageSchema,
} from "../schemas/conversation.schema";
import * as conversationService from "../services/conversation.service";

export async function listConversationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listConversationsQuerySchema.parse(req.query);
    const conversations = await conversationService.listConversations(req.user!.sub, query.box);
    res.status(200).json(conversations);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await conversationService.getUnreadCount(req.user!.sub);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getConversationWithUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const result = await conversationService.getConversationWithUser(
      req.user!.sub,
      Number(req.params.userId),
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function sendMessageHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = sendMessageSchema.parse(req.body);
    const result = await conversationService.sendMessage(req.user!.sub, input);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

export async function respondToConversationHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const input = respondConversationSchema.parse(req.body);
    const conversation = await conversationService.respondToConversation(
      Number(req.params.id),
      req.user!.sub,
      input.status,
    );
    res.status(200).json(conversation);
  } catch (error) {
    next(error);
  }
}

export async function markReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await conversationService.markRead(Number(req.params.id), req.user!.sub);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
