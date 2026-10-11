import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createProgressUpdateRequest, listProgressUpdatesRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

export function useProgressUpdates(projectId: number) {
  return useQuery({
    queryKey: ["progress-updates", projectId],
    queryFn: () => listProgressUpdatesRequest(projectId),
    enabled: Number.isFinite(projectId),
  });
}

export function useCreateProgressUpdate(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      text: string;
      activityId?: number;
      postedToFeed?: boolean;
      evidence?: { type: "FILE" | "LINK"; url: string; fileName?: string }[];
    }) => createProgressUpdateRequest(token!, projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["progress-updates", projectId] }),
  });
}

export function useCreateFeedPost() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: {
      projectId: number;
      text: string;
      evidence?: { type: "FILE" | "LINK"; url: string; fileName?: string }[];
    }) =>
      createProgressUpdateRequest(token!, variables.projectId, {
        text: variables.text,
        postedToFeed: true,
        evidence: variables.evidence,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["feed"] });
      queryClient.invalidateQueries({ queryKey: ["progress-updates", variables.projectId] });
    },
  });
}
