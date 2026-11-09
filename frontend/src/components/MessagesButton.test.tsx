import { describe, expect, it, vi, beforeEach } from "vitest";
import { Routes, Route } from "react-router-dom";
import { screen } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import MessagesButton from "./MessagesButton";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getMessagesUnreadCountRequest: vi.fn(),
  };
});

function renderButton() {
  return renderWithProviders(
    <Routes>
      <Route path="/inicio" element={<MessagesButton />} />
      <Route path="/mensajes" element={<p>Pantalla de mensajes</p>} />
    </Routes>,
    { route: "/inicio" },
  );
}

beforeEach(() => {
  vi.mocked(api.getMessagesUnreadCountRequest).mockReset();
});

describe("MessagesButton", () => {
  it("shows the sum of unread messages and pending requests", async () => {
    seedAuth();
    vi.mocked(api.getMessagesUnreadCountRequest).mockResolvedValue({ count: 2, pendingRequests: 3 });
    renderButton();

    expect(await screen.findByText("5")).toBeInTheDocument();
  });

  it("caps the badge at '9+' when the sum is over 9", async () => {
    seedAuth();
    vi.mocked(api.getMessagesUnreadCountRequest).mockResolvedValue({ count: 8, pendingRequests: 4 });
    renderButton();

    expect(await screen.findByText("9+")).toBeInTheDocument();
  });

  it("shows no badge when the sum is zero", async () => {
    seedAuth();
    vi.mocked(api.getMessagesUnreadCountRequest).mockResolvedValue({ count: 0, pendingRequests: 0 });
    renderButton();

    await screen.findByLabelText("Mensajes");
    expect(screen.queryByText("9+")).not.toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("links to /mensajes", async () => {
    seedAuth();
    vi.mocked(api.getMessagesUnreadCountRequest).mockResolvedValue({ count: 0, pendingRequests: 0 });
    renderButton();

    const link = await screen.findByLabelText("Mensajes");
    expect(link).toHaveAttribute("href", "/mensajes");
  });
});
