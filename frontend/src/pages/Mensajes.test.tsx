import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders, seedAuth } from "../test-utils";
import Mensajes from "./Mensajes";
import * as api from "../services/api";
import type { ConversationSummary } from "../types/conversation";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listConversationsRequest: vi.fn(),
    getMessagesUnreadCountRequest: vi.fn(),
    searchUsersRequest: vi.fn(),
  };
});

function conversationFixture(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    id: 10,
    status: "ACCEPTED",
    initiatorId: 1,
    viewerIsInitiator: true,
    otherUser: { id: 2, name: "Ana Pérez", accountType: "STUDENT" },
    lastMessage: {
      id: 100,
      conversationId: 10,
      senderId: 2,
      text: "Hola, ¿cómo va el proyecto?",
      read: false,
      createdAt: new Date().toISOString(),
    },
    unreadCount: 1,
    lastMessageAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.listConversationsRequest).mockReset();
  vi.mocked(api.getMessagesUnreadCountRequest)
    .mockReset()
    .mockResolvedValue({ count: 0, pendingRequests: 0 });
  vi.mocked(api.searchUsersRequest).mockReset().mockResolvedValue([]);
});

describe("Mensajes — tabs", () => {
  it("shows the inbox tab by default", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([conversationFixture()]);
    renderWithProviders(<Mensajes />, { route: "/mensajes" });

    expect(await screen.findByText("Ana Pérez")).toBeInTheDocument();
    expect(api.listConversationsRequest).toHaveBeenCalledWith("test-token", "inbox");
  });

  it("switches to the requests tab via ?tab=solicitudes", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([]);
    renderWithProviders(<Mensajes />, { route: "/mensajes?tab=solicitudes" });

    expect(await screen.findByText("No tienes solicitudes de mensaje.")).toBeInTheDocument();
    expect(api.listConversationsRequest).toHaveBeenCalledWith("test-token", "requests");
  });

  it("clicking the Solicitudes tab navigates there", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([]);
    const user = userEvent.setup();
    renderWithProviders(<Mensajes />, { route: "/mensajes" });

    await screen.findByText("No tienes conversaciones.");
    await user.click(screen.getByRole("button", { name: /Solicitudes/ }));

    expect(await screen.findByText("No tienes solicitudes de mensaje.")).toBeInTheDocument();
  });

  it("shows a pill badge with the pending requests count on the Solicitudes tab", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([]);
    vi.mocked(api.getMessagesUnreadCountRequest).mockResolvedValue({ count: 0, pendingRequests: 4 });
    renderWithProviders(<Mensajes />, { route: "/mensajes" });

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Solicitudes/ })).toHaveTextContent("4"),
    );
  });
});

describe("Mensajes — rows", () => {
  it("links each row to the conversation with that user", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([conversationFixture()]);
    renderWithProviders(<Mensajes />, { route: "/mensajes" });

    const link = await screen.findByRole("link", { name: /Ana Pérez/ });
    expect(link).toHaveAttribute("href", "/mensajes/2");
  });

  it("shows the 'Solicitud enviada' chip when the viewer is the initiator of a pending request", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([
      conversationFixture({ status: "PENDING", viewerIsInitiator: true }),
    ]);
    renderWithProviders(<Mensajes />, { route: "/mensajes" });

    expect(await screen.findByText("Solicitud enviada")).toBeInTheDocument();
  });

  it("does not show the chip for an accepted conversation", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([conversationFixture({ status: "ACCEPTED" })]);
    renderWithProviders(<Mensajes />, { route: "/mensajes" });

    await screen.findByText("Ana Pérez");
    expect(screen.queryByText("Solicitud enviada")).not.toBeInTheDocument();
  });
});

describe("Mensajes — empty states", () => {
  it("shows the empty inbox message", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([]);
    renderWithProviders(<Mensajes />, { route: "/mensajes" });

    expect(await screen.findByText("No tienes conversaciones.")).toBeInTheDocument();
  });

  it("shows the empty requests message", async () => {
    seedAuth();
    vi.mocked(api.listConversationsRequest).mockResolvedValue([]);
    renderWithProviders(<Mensajes />, { route: "/mensajes?tab=solicitudes" });

    expect(await screen.findByText("No tienes solicitudes de mensaje.")).toBeInTheDocument();
  });
});
