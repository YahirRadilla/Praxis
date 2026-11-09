import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  followUserRequest,
  getPublicProfileRequest,
  listUserPublicProjectsRequest,
  unfollowUserRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

export function usePublicProfile(id: number) {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["user-profile", id, user?.id ?? "anon"],
    queryFn: () => getPublicProfileRequest(id, token),
    enabled: Number.isFinite(id),
  });
}

export function useUserPublicProjects(id: number) {
  return useQuery({
    queryKey: ["user-profile", id, "projects"],
    queryFn: () => listUserPublicProjectsRequest(id),
    enabled: Number.isFinite(id),
  });
}

export function useFollowUser(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => followUserRequest(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-profile", id] }),
  });
}

export function useUnfollowUser(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => unfollowUserRequest(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user-profile", id] }),
  });
}
