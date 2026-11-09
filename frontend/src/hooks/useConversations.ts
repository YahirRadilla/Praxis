import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getConversationWithUserRequest,
  getMessagesUnreadCountRequest,
  listConversationsRequest,
  markConversationReadRequest,
  respondConversationRequest,
  sendMessageRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { SendMessagePayload } from "../types/conversation";

const LIST_POLL_MS = 20_000;
const UNREAD_COUNT_POLL_MS = 30_000;
// Fast poll: this is the open thread, so it needs to feel closer to live.
const THREAD_POLL_MS = 5_000;

export function useConversations(box: "inbox" | "requests") {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["conversations", "list", box],
    queryFn: () => listConversationsRequest(token!, box),
    enabled: isAuthenticated,
    refetchInterval: LIST_POLL_MS,
  });
}

export function useMessagesUnreadCount() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["conversations", "unread-count"],
    queryFn: () => getMessagesUnreadCountRequest(token!),
    enabled: isAuthenticated,
    refetchInterval: UNREAD_COUNT_POLL_MS,
  });
}

export function useConversationWithUser(userId: number) {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["conversations", "with", userId],
    queryFn: () => getConversationWithUserRequest(token!, userId),
    enabled: isAuthenticated,
    refetchInterval: THREAD_POLL_MS,
  });
}

function useInvalidateConversations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["conversations"] });
}

export function useSendMessage() {
  const { token } = useAuth();
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: (payload: SendMessagePayload) => sendMessageRequest(token!, payload),
    onSuccess: invalidate,
  });
}

export function useRespondConversation() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: "ACCEPTED" | "REJECTED" }) =>
      respondConversationRequest(token!, id, status),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkConversationRead() {
  const { token } = useAuth();
  const invalidate = useInvalidateConversations();
  return useMutation({
    mutationFn: (id: number) => markConversationReadRequest(token!, id),
    onSuccess: invalidate,
  });
}
