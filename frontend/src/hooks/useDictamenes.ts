import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createDictamenRequest, listDictamenesRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { DictamenVerdict } from "../types/dictamen";

export function useDictamenes(projectId: number) {
  return useQuery({
    queryKey: ["dictamenes", projectId],
    queryFn: () => listDictamenesRequest(projectId),
    enabled: Number.isFinite(projectId),
  });
}

export function useCreateDictamen(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { verdict: DictamenVerdict; comment: string }) =>
      createDictamenRequest(token!, projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dictamenes", projectId] }),
  });
}
