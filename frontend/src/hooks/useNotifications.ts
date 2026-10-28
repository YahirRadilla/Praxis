import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnreadCountRequest,
  listNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

// Explicit scope note: this is polling, not real-time push. 45s balances a
// bell badge that feels reasonably live against not hammering the API.
const UNREAD_COUNT_POLL_MS = 45_000;

export function useUnreadNotificationCount() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: () => getUnreadCountRequest(token!),
    enabled: isAuthenticated,
    refetchInterval: UNREAD_COUNT_POLL_MS,
  });
}

export function useNotifications(enabled: boolean) {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: () => listNotificationsRequest(token!),
    enabled: isAuthenticated && enabled,
  });
}

function useInvalidateNotifications() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    queryClient.invalidateQueries({ queryKey: ["notifications", "list"] });
  };
}

export function useMarkNotificationRead() {
  const { token } = useAuth();
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: number) => markNotificationReadRequest(token!, id),
    onSuccess: invalidate,
  });
}

export function useMarkAllNotificationsRead() {
  const { token } = useAuth();
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: () => markAllNotificationsReadRequest(token!),
    onSuccess: invalidate,
  });
}
