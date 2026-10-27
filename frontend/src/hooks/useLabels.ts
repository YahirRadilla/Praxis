import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createLabelRequest, listLabelsRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useLabels(projectId: number) {
  return useQuery({
    queryKey: ["labels", projectId],
    queryFn: () => listLabelsRequest(projectId),
    enabled: Number.isFinite(projectId),
  });
}

export function useCreateLabel(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; colorHex: string }) =>
      createLabelRequest(token!, projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["labels", projectId] }),
  });
}
