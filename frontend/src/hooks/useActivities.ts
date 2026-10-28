import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createActivityAttachmentRequest,
  createActivityCommentRequest,
  createActivityRequest,
  createChecklistItemRequest,
  createChecklistSectionRequest,
  deleteActivityAttachmentRequest,
  deleteActivityCommentRequest,
  deleteActivityRequest,
  deleteChecklistItemRequest,
  deleteChecklistSectionRequest,
  getActivityDetailRequest,
  listActivitiesRequest,
  listMyActivitiesRequest,
  moveActivityRequest,
  updateActivityRequest,
  updateChecklistItemRequest,
  updateChecklistSectionRequest,
  type UpdateActivityPayload,
} from "../services/api";
import { useAuth } from "../context/AuthContext";
import type { Activity, ActivityPriority, ActivityStatus } from "../types/activity";
import { computeMoveResult } from "../components/activities/reorderActivities";

export function useActivities(projectId: number, options: { enabled?: boolean } = {}) {
  const { token, user } = useAuth();
  const { enabled = true } = options;
  return useQuery({
    queryKey: ["activities", projectId, user?.id ?? "anon"],
    queryFn: () => listActivitiesRequest(projectId, token),
    enabled: Number.isFinite(projectId) && enabled,
  });
}

/**
 * Cross-project "Mis tareas": activities assigned to the current user across
 * every project they're still a member of.
 */
export function useMyActivities(filters: { status?: ActivityStatus; projectId?: number } = {}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["my-activities", filters.status, filters.projectId],
    queryFn: () => listMyActivitiesRequest(token!, filters),
    enabled: !!token,
  });
}

export function useCreateActivity(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      title: string;
      description?: string;
      dueDate: string;
      priority?: ActivityPriority;
      status?: ActivityStatus;
      assigneeIds?: number[];
      labelIds?: number[];
    }) => createActivityRequest(token!, projectId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", projectId] }),
  });
}

export function useMoveActivity(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({
      activityId,
      status,
      position,
    }: {
      activityId: number;
      status: ActivityStatus;
      position: number;
    }) => moveActivityRequest(token!, projectId, activityId, { status, position }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["activities", projectId] }),
  });

  /**
   * Applies the reorder to the activities cache synchronously, in the same
   * tick as the caller, instead of deferring to the mutation's `onMutate`.
   *
   * TanStack Query always invokes `onMutate` on a later microtask relative to
   * the `mutate()` call (its internal `execute()` is an `async` function that
   * hits an `await` before ever running our callback). `ActivityBoard`'s drag
   * handler clears the drag-overlay state (`setActiveId(null)`) synchronously
   * in the same event. That gap used to cause the board's drop-end "duplicate
   * card" flash: the overlay's ghost would disappear and the real card would
   * briefly re-render at its *old* position (cache not updated yet), then pop
   * into its new position once the deferred optimistic update finally landed
   * — most visible when dropping at the end of a column, where the pop-in has
   * no sibling card to animate against. Doing the array mutation here, before
   * `mutate()` is even called, means it lands in the exact same render/commit
   * as whatever state change the caller makes right alongside it.
   */
  function move(
    activityId: number,
    status: ActivityStatus,
    position: number,
    options?: { onSuccess?: () => void; onError?: (error: unknown) => void },
  ) {
    void queryClient.cancelQueries({ queryKey: ["activities", projectId] });
    const previous = queryClient.getQueryData<Activity[]>(["activities", projectId]);
    if (previous) {
      queryClient.setQueryData(
        ["activities", projectId],
        computeMoveResult(previous, activityId, status, position),
      );
    }
    mutation.mutate(
      { activityId, status, position },
      {
        onSuccess: options?.onSuccess,
        onError: (error) => {
          if (previous) {
            queryClient.setQueryData(["activities", projectId], previous);
          }
          options?.onError?.(error);
        },
      },
    );
  }

  return { move, isPending: mutation.isPending };
}

export function useDeleteActivity(projectId: number) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (activityId: number) => deleteActivityRequest(token!, projectId, activityId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", projectId] }),
  });
}

// --- Activity detail (Fase E) -------------------------------------------------

export function useActivityDetail(projectId: number, activityId: number) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["activity-detail", projectId, activityId],
    queryFn: () => getActivityDetailRequest(projectId, activityId, token),
    enabled: Number.isFinite(projectId) && Number.isFinite(activityId),
  });
}

/**
 * Every detail-modal mutation touches both the detail query (full payload)
 * and the board-list query (counts/labels/checklist-done booleans shown on
 * the card), so this invalidates both instead of repeating the pair everywhere.
 */
function useInvalidateActivity(projectId: number, activityId: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["activity-detail", projectId, activityId] });
    queryClient.invalidateQueries({ queryKey: ["activities", projectId] });
  };
}

export function useUpdateActivity(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (payload: UpdateActivityPayload) =>
      updateActivityRequest(token!, projectId, activityId, payload),
    onSuccess: invalidate,
  });
}

export function useCreateChecklistSection(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (payload: { name: string }) =>
      createChecklistSectionRequest(token!, projectId, activityId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistSection(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: ({ sectionId, ...payload }: { sectionId: number; name?: string; position?: number }) =>
      updateChecklistSectionRequest(token!, projectId, activityId, sectionId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistSection(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (sectionId: number) =>
      deleteChecklistSectionRequest(token!, projectId, activityId, sectionId),
    onSuccess: invalidate,
  });
}

export function useCreateChecklistItem(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (payload: { text: string; note?: string; sectionId?: number }) =>
      createChecklistItemRequest(token!, projectId, activityId, payload),
    onSuccess: invalidate,
  });
}

export function useUpdateChecklistItem(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: ({
      itemId,
      ...payload
    }: {
      itemId: number;
      text?: string;
      note?: string;
      sectionId?: number | null;
      done?: boolean;
      position?: number;
    }) => updateChecklistItemRequest(token!, projectId, activityId, itemId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteChecklistItem(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (itemId: number) => deleteChecklistItemRequest(token!, projectId, activityId, itemId),
    onSuccess: invalidate,
  });
}

export function useCreateActivityComment(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (payload: { text: string }) =>
      createActivityCommentRequest(token!, projectId, activityId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteActivityComment(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (commentId: number) =>
      deleteActivityCommentRequest(token!, projectId, activityId, commentId),
    onSuccess: invalidate,
  });
}

export function useCreateActivityAttachment(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (payload: { url: string; fileName: string; mimeType: string; sizeBytes: number }) =>
      createActivityAttachmentRequest(token!, projectId, activityId, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteActivityAttachment(projectId: number, activityId: number) {
  const { token } = useAuth();
  const invalidate = useInvalidateActivity(projectId, activityId);
  return useMutation({
    mutationFn: (attachmentId: number) =>
      deleteActivityAttachmentRequest(token!, projectId, activityId, attachmentId),
    onSuccess: invalidate,
  });
}
