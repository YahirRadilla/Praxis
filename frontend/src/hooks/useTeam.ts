import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inviteToTeamRequest,
  leaveTeamRequest,
  listPendingRequestsRequest,
  listReceivedInvitesRequest,
  listReceivedRequestsRequest,
  listTeamRequest,
  removeTeamMemberRequest,
  requestToJoinRequest,
  respondToRequestRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useTeam(projectId: number) {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["team", projectId, user?.id ?? "anon"],
    queryFn: () => listTeamRequest(projectId, token),
    enabled: Number.isFinite(projectId),
  });
}

export function usePendingRequests(projectId: number, enabled = true) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["team-requests", projectId],
    queryFn: () => listPendingRequestsRequest(token!, projectId),
    enabled: Number.isFinite(projectId) && !!token && enabled,
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
    mutationFn: ({ userId, purpose }: { userId: number; purpose?: "MEMBER" | "EVALUATOR" }) =>
      inviteToTeamRequest(token!, projectId, userId, purpose),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-requests", projectId] });
      // An EVALUATOR-purpose invite changes the owner's `pendingEvaluatorInvites`
      // (WU-08 gap fix): without this, "Invitación pendiente: X" only shows up
      // after some other refetch, not right after sending the invite.
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
}

/** Leave the team as an accepted member, or unlink yourself as a confirmed
 * evaluator — both go through the same `DELETE /team/me` endpoint. */
export function useLeaveTeam(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveTeamRequest(token!, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["team", projectId] });
    },
  });
}

/** Owner-only: remove a member or unlink an evaluator. */
export function useRemoveTeamMember(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => removeTeamMemberRequest(token!, projectId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["team", projectId] });
    },
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["team-requests", "received"] });
      queryClient.invalidateQueries({ queryKey: ["team-requests", "received-invites"] });
      queryClient.invalidateQueries({ queryKey: ["team"] });
      // Accepting an EVALUATOR invite fills teacherId/organizationId on the
      // project (plan §2 decision #6) — invalidate it too, not just the
      // team-requests lists, or the project page keeps showing it unlinked.
      queryClient.invalidateQueries({ queryKey: ["project", data.projectId] });
    },
  });
}
