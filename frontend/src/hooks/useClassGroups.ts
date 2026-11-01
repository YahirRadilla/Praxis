import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addClassGroupResourceRequest,
  createClassGroupRequest,
  deleteClassGroupResourceRequest,
  getClassGroupRequest,
  joinClassGroupRequest,
  leaveClassGroupRequest,
  listClassGroupMembersRequest,
  listJoinedClassGroupsRequest,
  listMyClassGroupsRequest,
  removeClassGroupMemberRequest,
  searchClassGroupsRequest,
  updateClassGroupRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import type {
  CreateClassGroupPayload,
  CreateClassGroupResourcePayload,
  UpdateClassGroupPayload,
} from "../types/class-group";

export function useClassGroup(id: number) {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["class-group", id, user?.id ?? "anon"],
    queryFn: () => getClassGroupRequest(id, token),
    enabled: Number.isFinite(id),
  });
}

export function useSearchClassGroups(q?: string) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["class-groups", "search", q ?? ""],
    queryFn: () => searchClassGroupsRequest(q, token),
  });
}

export function useMyClassGroups() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["class-groups", "mine"],
    queryFn: () => listMyClassGroupsRequest(token!),
    enabled: isAuthenticated,
  });
}

export function useJoinedClassGroups() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["class-groups", "joined"],
    queryFn: () => listJoinedClassGroupsRequest(token!),
    enabled: isAuthenticated,
  });
}

export function useCreateClassGroup() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClassGroupPayload) => createClassGroupRequest(token!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-groups"] }),
  });
}

export function useUpdateClassGroup(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateClassGroupPayload) => updateClassGroupRequest(token!, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-group", id] });
      queryClient.invalidateQueries({ queryKey: ["class-groups"] });
    },
  });
}

/** Resources arrive nested inside `GET /class-groups/:id`, so adding/removing
 * one just invalidates the class group query instead of a separate list. */
export function useAddClassGroupResource(classGroupId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateClassGroupResourcePayload) =>
      addClassGroupResourceRequest(token!, classGroupId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-group", classGroupId] }),
  });
}

export function useDeleteClassGroupResource(classGroupId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: number) =>
      deleteClassGroupResourceRequest(token!, classGroupId, resourceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["class-group", classGroupId] }),
  });
}

export function useJoinClassGroup(classGroupId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => joinClassGroupRequest(classGroupId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-group", classGroupId] });
      queryClient.invalidateQueries({ queryKey: ["class-groups", "joined"] });
    },
  });
}

export function useLeaveClassGroup(classGroupId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveClassGroupRequest(classGroupId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-group", classGroupId] });
      queryClient.invalidateQueries({ queryKey: ["class-groups", "joined"] });
    },
  });
}

export function useClassGroupMembers(id: number) {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["class-group", id, "members"],
    queryFn: () => listClassGroupMembersRequest(id, token!),
    enabled: Number.isFinite(id) && isAuthenticated,
  });
}

export function useRemoveClassGroupMember(classGroupId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => removeClassGroupMemberRequest(classGroupId, userId, token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-group", classGroupId] });
    },
  });
}
