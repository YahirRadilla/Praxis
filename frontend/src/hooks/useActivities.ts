import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActivityRequest, listActivitiesRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useActivities(projectId: number) {
  return useQuery({
    queryKey: ["activities", projectId],
    queryFn: () => listActivitiesRequest(projectId),
    enabled: Number.isFinite(projectId),
  });
}

export function useCreateActivity(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { title: string; description?: string; dueDate: string }) =>
      createActivityRequest(token!, projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", projectId] }),
  });
}
