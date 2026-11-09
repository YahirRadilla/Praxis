import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { likePostRequest, listFeedRequest, unlikePostRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useFeed(categoryId?: number) {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["feed", categoryId, user?.id ?? "anon"],
    queryFn: () => listFeedRequest({ categoryId }, token),
  });
}

export function useLikePost() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updateId: number) => likePostRequest(token!, updateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}

export function useUnlikePost() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updateId: number) => unlikePostRequest(token!, updateId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feed"] }),
  });
}
