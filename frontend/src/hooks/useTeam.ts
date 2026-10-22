import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteToTeamRequest,
  listPendingRequestsRequest,
  listReceivedInvitesRequest,
  listReceivedRequestsRequest,
  listTeamRequest,
  requestToJoinRequest,
  respondToRequestRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useTeam(projectId: number) {
  return useQuery({
    queryKey: ["team", projectId],
    queryFn: () => listTeamRequest(projectId),
    enabled: Number.isFinite(projectId),
  });
}

export function usePendingRequests(projectId: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["team-requests", projectId],
    queryFn: () => listPendingRequestsRequest(token!, projectId),
    enabled: Number.isFinite(projectId) && !!token,
  });
}

export function useRequestToJoin(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message?: string) => requestToJoinRequest(token!, projectId, message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-requests", projectId] }),
  });
}

export function useInviteToTeam(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => inviteToTeamRequest(token!, projectId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-requests", projectId] }),
  });
}

export function useRespondToRequest(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: number; status: "ACCEPTED" | "REJECTED" }) =>
      respondToRequestRequest(token!, requestId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-requests", projectId] });
      queryClient.invalidateQueries({ queryKey: ["team", projectId] });
      queryClient.invalidateQueries({ queryKey: ["team-requests", "received"] });
    },
  });
}

export function useReceivedRequests() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["team-requests", "received"],
    queryFn: () => listReceivedRequestsRequest(token!),
    enabled: isAuthenticated,
  });
}

export function useReceivedInvites() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["team-requests", "received-invites"],
    queryFn: () => listReceivedInvitesRequest(token!),
    enabled: isAuthenticated,
  });
}

export function useRespondToReceivedRequest() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: number; status: "ACCEPTED" | "REJECTED" }) =>
      respondToRequestRequest(token!, requestId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-requests", "received"] });
      queryClient.invalidateQueries({ queryKey: ["team-requests", "received-invites"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
    },
  });
}
