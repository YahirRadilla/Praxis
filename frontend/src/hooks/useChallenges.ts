import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createChallengeRequest,
  getChallengeRequest,
  listChallengesRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { CreateChallengePayload } from "../types/challenge";

export function useChallenges(sdgIds?: number[]) {
  return useQuery({
    queryKey: ["challenges", sdgIds],
    queryFn: () => listChallengesRequest({ sdgIds }),
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
