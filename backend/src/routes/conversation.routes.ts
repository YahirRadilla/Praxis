import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getConversationWithUserHandler,
  getUnreadCountHandler,
  listConversationsHandler,
  markReadHandler,
  respondToConversationHandler,
  sendMessageHandler,
} from "../controllers/conversation.controller";

export const conversationRoutes = Router();

// `/unread-count` and `/with/:userId` must stay above `/:id` — otherwise
// Express would match them as `:id` first.
conversationRoutes.get("/", requireAuth, listConversationsHandler);
conversationRoutes.get("/unread-count", requireAuth, getUnreadCountHandler);
conversationRoutes.get("/with/:userId", requireAuth, getConversationWithUserHandler);
conversationRoutes.post("/messages", requireAuth, sendMessageHandler);
conversationRoutes.patch("/:id", requireAuth, respondToConversationHandler);
conversationRoutes.post("/:id/read", requireAuth, markReadHandler);
