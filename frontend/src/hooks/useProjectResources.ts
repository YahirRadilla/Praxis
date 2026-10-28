import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProjectResourceRequest,
  deleteProjectResourceRequest,
  listProjectResourcesRequest,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { CreateProjectResourcePayload } from "../types/project";

/**
 * Lazily fetched: resources only matter once the Anexos tab is opened, so
 * callers pass `enabled` tied to that tab being active rather than always
 * loading them alongside the rest of the project detail page.
 */
export function useProjectResources(projectId: number, enabled: boolean) {
  const { token, user } = useAuth();
  return useQuery({
    queryKey: ["project-resources", projectId, user?.id ?? "anon"],
    queryFn: () => listProjectResourcesRequest(projectId, token),
    enabled: Number.isFinite(projectId) && enabled,
  });
}

export function useCreateProjectResource(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectResourcePayload) =>
      createProjectResourceRequest(token!, projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-resources", projectId] }),
  });
}

export function useDeleteProjectResource(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resourceId: number) => deleteProjectResourceRequest(token!, projectId, resourceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["project-resources", projectId] }),
  });
}
