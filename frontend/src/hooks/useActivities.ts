import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActivityRequest, listActivitiesRequest, updateActivityStatusRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export type SettableActivityStatus = "PENDING" | "IN_PROGRESS" | "DONE";

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
    mutationFn: (payload: { title: string; description?: string; dueDate: string; assigneeId?: number }) =>
      createActivityRequest(token!, projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", projectId] }),
  });
}

export function useUpdateActivityStatus(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ activityId, status }: { activityId: number; status: SettableActivityStatus }) =>
      updateActivityStatusRequest(token!, projectId, activityId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", projectId] }),
  });
}
