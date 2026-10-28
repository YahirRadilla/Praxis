import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDictamenRequest, listDictamenesRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { DictamenVerdict } from "../types/dictamen";

export function useDictamenes(projectId: number, options: { enabled?: boolean } = {}) {
  const { token, user } = useAuth();
  const { enabled = true } = options;
  return useQuery({
    queryKey: ["dictamenes", projectId, user?.id ?? "anon"],
    queryFn: () => listDictamenesRequest(projectId, token),
    // Dictamen history is insider-only on the backend (owner/member/evaluator,
    // 404 for anyone else); gate the request the same way so outsiders don't
    // fire a doomed request.
    enabled: Number.isFinite(projectId) && enabled,
  });
}

export function useCreateDictamen(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { verdict: DictamenVerdict; comment: string }) =>
      createDictamenRequest(token!, projectId, payload),
    onSuccess: () => {
      // A Dictamen is non-gating feedback: it never changes the project's
      // visibility or archived state, so only the dictamenes list itself
      // needs to be invalidated.
      queryClient.invalidateQueries({ queryKey: ["dictamenes", projectId] });
    },
  });
}
