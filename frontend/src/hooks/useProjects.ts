import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveProjectRequest,
  createProjectRequest,
  getProjectRequest,
  listMyProjectsRequest,
  listSavedProjectsRequest,
  publishProjectRequest,
  saveProjectRequest,
  searchProjectsRequest,
  submitProjectForReviewRequest,
  unsaveProjectRequest,
  updateProjectRequest,
  type UpdateProjectPayload,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { CreateProjectPayload, SearchProjectsParams } from "../types/project";

export function useSearchProjects(params: SearchProjectsParams) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => searchProjectsRequest(params),
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => getProjectRequest(id),
    enabled: Number.isFinite(id),
  });
}

export function useCreateProject() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateProjectPayload) => createProjectRequest(token!, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useUpdateProject(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateProjectPayload) => updateProjectRequest(token!, id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function usePublishProject(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => publishProjectRequest(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useSubmitForReview(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => submitProjectForReviewRequest(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useArchiveProject(id: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => archiveProjectRequest(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useMyProjects() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["projects", "mine"],
    queryFn: () => listMyProjectsRequest(token!),
    enabled: isAuthenticated,
  });
}

export function useSavedProjects() {
  const { token, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ["projects", "saved"],
    queryFn: () => listSavedProjectsRequest(token!),
    enabled: isAuthenticated,
  });
}

export function useSaveProject() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => saveProjectRequest(token!, projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", "saved"] }),
  });
}

export function useUnsaveProject() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (projectId: number) => unsaveProjectRequest(token!, projectId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", "saved"] }),
  });
}
