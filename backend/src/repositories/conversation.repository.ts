import type { ConversationStatus } from "@prisma/client";
import { prisma } from "./prisma-client";

export const chatUserSelect = {
  id: true,
  name: true,
  accountType: true,
} as const;

/**
 * Shared `include` shape for a conversation row rendered as a
 * `ConversationSummary`: both participants (so the service can pick
 * "the other one" relative to the viewer), the single newest message (for
 * the list preview), and a filtered relation count of unread messages sent
 * by the OTHER participant (messages the viewer sent never count as
 * "unread" from their own perspective).
 */
export function summaryInclude(viewerId: number) {
  return {
    userA: { select: chatUserSelect },
    userB: { select: chatUserSelect },
    messages: { orderBy: { createdAt: "desc" as const }, take: 1 },
    _count: {
      select: {
        messages: { where: { read: false, senderId: { not: viewerId } } },
      },
    },
  };
}

export function findChatUser(id: number) {
  return prisma.user.findUnique({ where: { id }, select: chatUserSelect });
}

/**
 * Plain lookup (no viewer-dependent `include`) — used internally by the
 * service to inspect the state machine (status/initiatorId) before
 * deciding what to do; the caller re-fetches with `findConversationById`
 * once it knows who the viewer is, to get viewer-correct unread counts.
 */
export function findConversationByPair(userAId: number, userBId: number) {
  return prisma.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
}

export function findConversationById(id: number, viewerId: number) {
  return prisma.conversation.findUnique({
    where: { id },
    include: summaryInclude(viewerId),
  });
}

interface CreateConversationWithMessageInput {
  userAId: number;
  userBId: number;
  initiatorId: number;
  senderId: number;
  text: string;
}

export async function createConversationWithMessage({
  userAId,
  userBId,
  initiatorId,
  senderId,
  text,
}: CreateConversationWithMessageInput) {
  const conversation = await prisma.conversation.create({
    data: {
      userAId,
      userBId,
      initiatorId,
      messages: { create: { senderId, text } },
    },
    include: summaryInclude(initiatorId),
  });
  return { conversation, message: conversation.messages[0] };
}

/**
 * Appends a message to an existing conversation inside a transaction,
 * bumping `lastMessageAt` and — when `nextStatus` is given — resolving the
 * conversation's status (the implicit-accept path) at the same time.
 */
export async function appendMessage(
  conversationId: number,
  senderId: number,
  text: string,
  nextStatus?: ConversationStatus,
) {
  return prisma.$transaction(async (tx) => {
    const message = await tx.message.create({ data: { conversationId, senderId, text } });
    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        ...(nextStatus ? { status: nextStatus, resolvedAt: new Date() } : {}),
      },
    });
    return message;
  });
}

export function updateConversationStatus(id: number, status: ConversationStatus) {
  return prisma.conversation.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
  });
}

export function listConversationsForUser(viewerId: number, box: "inbox" | "requests") {
  const participant = { OR: [{ userAId: viewerId }, { userBId: viewerId }] };

  const where =
    box === "inbox"
      ? {
          AND: [
            participant,
            {
              OR: [
                { status: "ACCEPTED" as const },
                {
                  initiatorId: viewerId,
                  status: { in: ["PENDING", "REJECTED"] as ConversationStatus[] },
                },
              ],
            },
          ],
        }
      : {
          AND: [participant, { status: "PENDING" as const, initiatorId: { not: viewerId } }],
        };

  return prisma.conversation.findMany({
    where,
    include: summaryInclude(viewerId),
    orderBy: { lastMessageAt: "desc" },
  });
}

export function findConversationDetail(id: number, viewerId: number) {
  return prisma.conversation.findUnique({
    where: { id },
    include: {
      ...summaryInclude(viewerId),
      messages: { orderBy: { createdAt: "desc" as const }, take: 100 },
    },
  });
}

export function markConversationRead(conversationId: number, viewerId: number) {
  return prisma.message.updateMany({
    where: { conversationId, senderId: { not: viewerId }, read: false },
    data: { read: true },
  });
}

export function countUnreadMessages(viewerId: number) {
  return prisma.message.count({
    where: {
      read: false,
      senderId: { not: viewerId },
      conversation: {
        status: { not: "REJECTED" },
        OR: [{ userAId: viewerId }, { userBId: viewerId }],
      },
    },
  });
}

export function countPendingRequests(viewerId: number) {
  return prisma.conversation.count({
    where: {
      status: "PENDING",
      initiatorId: { not: viewerId },
      OR: [{ userAId: viewerId }, { userBId: viewerId }],
    },
  });
}
