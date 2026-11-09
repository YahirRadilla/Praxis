import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../../test-utils";
import FeedPostCard from "./FeedPostCard";
import * as api from "../../services/api";
import { toast } from "sonner";
import type { FeedUpdate } from "../../types/activity";

vi.mock("../../services/api", async () => {
  const actual = await vi.importActual<typeof import("../../services/api")>("../../services/api");
  return {
    ...actual,
    likePostRequest: vi.fn(),
    unlikePostRequest: vi.fn(),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

function updateFixture(overrides: Partial<FeedUpdate> = {}): FeedUpdate {
  return {
    id: 10,
    projectId: 1,
    activityId: null,
    authorId: 7,
    text: "Avance de la semana",
    postedToFeed: true,
    validated: false,
    createdAt: new Date().toISOString(),
    author: { id: 7, name: "Autora del Avance" },
    evidence: [],
    project: {
      id: 1,
      name: "Proyecto Agua Limpia",
      sdgs: [],
      categories: [],
    },
    likeCount: 3,
    likedByMe: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.likePostRequest).mockReset();
  vi.mocked(api.unlikePostRequest).mockReset();
  vi.mocked(toast.error).mockReset();
  seedAuth();
});

describe("FeedPostCard", () => {
  it("renders the like count and the author link", () => {
    renderWithProviders(<FeedPostCard update={updateFixture()} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Autora del Avance" })).toHaveAttribute(
      "href",
      "/usuarios/7",
    );
  });

  it("likes the post when not yet liked", async () => {
    vi.mocked(api.likePostRequest).mockResolvedValue({ liked: true });
    const user = userEvent.setup();
    renderWithProviders(<FeedPostCard update={updateFixture({ likedByMe: false })} />);

    await user.click(screen.getByRole("button", { name: "Me gusta" }));

    await waitFor(() => expect(api.likePostRequest).toHaveBeenCalledWith("test-token", 10));
    expect(api.unlikePostRequest).not.toHaveBeenCalled();
  });

  it("unlikes the post when already liked by me", async () => {
    vi.mocked(api.unlikePostRequest).mockResolvedValue({ liked: false });
    const user = userEvent.setup();
    renderWithProviders(<FeedPostCard update={updateFixture({ likedByMe: true })} />);

    await user.click(screen.getByRole("button", { name: "Quitar me gusta" }));

    await waitFor(() => expect(api.unlikePostRequest).toHaveBeenCalledWith("test-token", 10));
    expect(api.likePostRequest).not.toHaveBeenCalled();
  });

  it("shows an error toast when the like request fails", async () => {
    vi.mocked(api.likePostRequest).mockRejectedValue(new Error("network down"));
    const user = userEvent.setup();
    renderWithProviders(<FeedPostCard update={updateFixture({ likedByMe: false })} />);

    await user.click(screen.getByRole("button", { name: "Me gusta" }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("No se pudo registrar tu me gusta."),
    );
  });
});
