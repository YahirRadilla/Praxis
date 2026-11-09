import type { Conversation, ConversationStatus, Message } from "@prisma/client";
import {
  appendMessage,
  countPendingRequests,
  countUnreadMessages,
  createConversationWithMessage,
  findChatUser,
  findConversationByPair,
  findConversationById,
  findConversationDetail,
  listConversationsForUser,
  markConversationRead,
  updateConversationStatus,
} from "../repositories/conversation.repository";
import { notifyUser } from "./notification.service";
import { HttpError } from "../types/http-error";
import type { SendMessageInput } from "../schemas/conversation.schema";

type ChatUser = { id: number; name: string; accountType: string };

type ConversationWithRelations = Conversation & {
  userA: ChatUser;
  userB: ChatUser;
  messages: Message[];
  _count: { messages: number };
};

/** Prisma's error shape for a unique-constraint violation (code P2002). */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002"
  );
}

export function pair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

function isParticipant(
  conversation: { userAId: number; userBId: number },
  userId: number,
): boolean {
  return conversation.userAId === userId || conversation.userBId === userId;
}

function toChatMessage(message: Message) {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    text: message.text,
    read: message.read,
    createdAt: message.createdAt,
  };
}

export function toSummary(row: ConversationWithRelations, viewerId: number) {
  const otherUser = row.userAId === viewerId ? row.userB : row.userA;
  return {
    id: row.id,
    status: row.status,
    initiatorId: row.initiatorId,
    viewerIsInitiator: row.initiatorId === viewerId,
    otherUser,
    lastMessage: row.messages[0] ? toChatMessage(row.messages[0]) : null,
    unreadCount: row._count.messages,
    lastMessageAt: row.lastMessageAt,
    createdAt: row.createdAt,
  };
}

function toDetail(row: ConversationWithRelations & { messages: Message[] }, viewerId: number) {
  const summary = toSummary(row, viewerId);
  return {
    ...summary,
    messages: [...row.messages].reverse().map(toChatMessage),
  };
}

export async function sendMessage(senderId: number, input: SendMessageInput) {
  const { recipientId, text } = input;

  if (recipientId === senderId) {
    throw new HttpError(400, "No puedes enviarte mensajes a ti mismo.");
  }

  const recipient = await findChatUser(recipientId);
  if (!recipient) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const [userAId, userBId] = pair(senderId, recipientId);

  let existing = await findConversationByPair(userAId, userBId);

  if (!existing) {
    try {
      const sender = await findChatUser(senderId);
      const { conversation, message } = await createConversationWithMessage({
        userAId,
        userBId,
        initiatorId: senderId,
        senderId,
        text,
      });

      await notifyUser(
        recipientId,
        "MESSAGE_REQUEST_RECEIVED",
        `${sender!.name} quiere enviarte un mensaje.`,
        `/mensajes/${senderId}`,
      );

      return {
        conversation: toSummary(conversation as ConversationWithRelations, senderId),
        message: toChatMessage(message),
      };
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
      // Race: the other side's first message to us landed first. Re-fetch
      // and fall through to the "existing conversation" branch below.
      existing = await findConversationByPair(userAId, userBId);
      if (!existing) {
        throw error;
      }
    }
  }

  const isSenderInitiator = existing.initiatorId === senderId;

  if (isSenderInitiator && existing.status === "REJECTED") {
    throw new HttpError(403, "Esta persona no aceptó tu solicitud de mensaje.");
  }

  const nextStatus: ConversationStatus | undefined =
    !isSenderInitiator && existing.status !== "ACCEPTED" ? "ACCEPTED" : undefined;

  const message = await appendMessage(existing.id, senderId, text, nextStatus);
  const updated = await findConversationById(existing.id, senderId);

  return {
    conversation: toSummary(updated as ConversationWithRelations, senderId),
    message: toChatMessage(message),
  };
}

export async function listConversations(viewerId: number, box: "inbox" | "requests") {
  const rows = await listConversationsForUser(viewerId, box);
  return (rows as ConversationWithRelations[]).map((row) => toSummary(row, viewerId));
}

export async function getConversationWithUser(viewerId: number, otherUserId: number) {
  if (otherUserId === viewerId) {
    throw new HttpError(400, "No puedes enviarte mensajes a ti mismo.");
  }

  const otherUser = await findChatUser(otherUserId);
  if (!otherUser) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const [userAId, userBId] = pair(viewerId, otherUserId);
  const existing = await findConversationByPair(userAId, userBId);
  if (!existing) {
    return { otherUser, conversation: null };
  }

  const detail = await findConversationDetail(existing.id, viewerId);
  return {
    otherUser,
    conversation: toDetail(detail as ConversationWithRelations & { messages: Message[] }, viewerId),
  };
}

export async function respondToConversation(
  id: number,
  actingUserId: number,
  status: "ACCEPTED" | "REJECTED",
) {
  const conversation = await findConversationById(id, actingUserId);
  if (!conversation || !isParticipant(conversation, actingUserId)) {
    throw new HttpError(404, "Conversación no encontrada.");
  }

  if (conversation.initiatorId === actingUserId) {
    throw new HttpError(403, "Solo quien recibió la solicitud puede responderla.");
  }

  if (conversation.status !== "PENDING") {
    throw new HttpError(409, "Esta solicitud ya fue resuelta.");
  }

  await updateConversationStatus(id, status);
  const updated = await findConversationById(id, actingUserId);

  if (status === "ACCEPTED") {
    const recipient = await findChatUser(actingUserId);
    await notifyUser(
      conversation.initiatorId,
      "MESSAGE_REQUEST_ACCEPTED",
      `${recipient!.name} aceptó tu solicitud de mensaje.`,
      `/mensajes/${actingUserId}`,
    );
  }

  return toSummary(updated as ConversationWithRelations, actingUserId);
}

export async function markRead(id: number, viewerId: number) {
  const conversation = await findConversationById(id, viewerId);
  if (!conversation || !isParticipant(conversation, viewerId)) {
    throw new HttpError(404, "Conversación no encontrada.");
  }

  await markConversationRead(id, viewerId);
}

export async function getUnreadCount(viewerId: number) {
  const [count, pendingRequests] = await Promise.all([
    countUnreadMessages(viewerId),
    countPendingRequests(viewerId),
  ]);
  return { count, pendingRequests };
}
