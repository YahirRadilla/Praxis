import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChallengeRequest,
  getChallengeRequest,
  listChallengesRequest,
  updateChallengeRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { CreateChallengePayload, ListChallengesParams } from "../types/challenge";

export function useChallenges(params: ListChallengesParams = {}) {
  return useQuery({
    queryKey: ["challenges", params],
    queryFn: () => listChallengesRequest(params),
  });
}

export function useChallenge(id: number) {
  return useQuery({
    queryKey: ["challenge", id],
    queryFn: () => getChallengeRequest(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateChallenge() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateChallengePayload) => createChallengeRequest(token!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["challenges"] }),
  });
}

export function useUpdateChallenge(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { bannerUrl: string | null }) => updateChallengeRequest(token!, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenge", id] });
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}
