import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChallengeRequest,
  getChallengeRequest,
  listChallengesRequest,
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
