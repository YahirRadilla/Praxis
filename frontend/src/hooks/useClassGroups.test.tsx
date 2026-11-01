import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { useJoinClassGroup, useLeaveClassGroup, useClassGroup } from "./useClassGroups";
import { AuthProvider } from "../context/AuthContext";
import { createTestQueryClient, seedAuth } from "../test-utils";
import * as api from "../services/api";
import type { ClassGroup } from "../types/class-group";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getClassGroupRequest: vi.fn(),
    joinClassGroupRequest: vi.fn(),
    leaveClassGroupRequest: vi.fn(),
  };
});

const CLASS_GROUP: ClassGroup = {
  id: 5,
  name: "Grupo",
  description: "desc",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  teacherId: 9,
  teacher: { id: 9, name: "Profa.", accountType: "TEACHER" },
  viewer: { isOwner: false, isMember: false, canJoin: true },
};

beforeEach(() => {
  vi.mocked(api.getClassGroupRequest).mockResolvedValue(CLASS_GROUP);
  vi.mocked(api.joinClassGroupRequest).mockResolvedValue({
    classGroupId: 5,
    userId: 1,
    joinedAt: new Date().toISOString(),
  });
  vi.mocked(api.leaveClassGroupRequest).mockResolvedValue({ success: true });
  seedAuth();
});

function makeWrapper() {
  const queryClient = createTestQueryClient();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    );
  }
  return { Wrapper, queryClient };
}

describe("useJoinClassGroup", () => {
  it("re-fetches the class group (and the joined list) after a successful join", async () => {
    const { Wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result: joinResult } = renderHook(() => useJoinClassGroup(5), { wrapper: Wrapper });
    const { result: groupResult } = renderHook(() => useClassGroup(5), { wrapper: Wrapper });

    await waitFor(() => expect(groupResult.current.isSuccess).toBe(true));

    act(() => {
      joinResult.current.mutate();
    });

    await waitFor(() => expect(joinResult.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["class-group", 5] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["class-groups", "joined"] });
  });
});

describe("useLeaveClassGroup", () => {
  it("re-fetches the class group (and the joined list) after a successful leave", async () => {
    const { Wrapper, queryClient } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result: leaveResult } = renderHook(() => useLeaveClassGroup(5), { wrapper: Wrapper });

    act(() => {
      leaveResult.current.mutate();
    });

    await waitFor(() => expect(leaveResult.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["class-group", 5] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["class-groups", "joined"] });
    expect(api.leaveClassGroupRequest).toHaveBeenCalledWith(5, "test-token");
  });
});
