import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { renderWithProviders, seedAuth } from "../test-utils";
import Conversacion from "./Conversacion";
import * as api from "../services/api";
import type { ConversationWithUser } from "../types/conversation";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getConversationWithUserRequest: vi.fn(),
    sendMessageRequest: vi.fn(),
    respondConversationRequest: vi.fn(),
    markConversationReadRequest: vi.fn(),
  };
});

const OTHER_USER = { id: 2, name: "Ana Pérez", accountType: "STUDENT" };

function fixture(overrides: Partial<ConversationWithUser> = {}): ConversationWithUser {
  return {
    otherUser: OTHER_USER,
    conversation: null,
    ...overrides,
  };
}

function renderConversacion(userId = "2") {
  return renderWithProviders(
    <Routes>
      <Route path="/mensajes/:userId" element={<Conversacion />} />
      <Route path="/mensajes" element={<p>Pantalla de mensajes</p>} />
    </Routes>,
    { route: `/mensajes/${userId}` },
  );
}

beforeEach(() => {
  vi.mocked(api.getConversationWithUserRequest).mockReset();
  vi.mocked(api.sendMessageRequest).mockReset();
  vi.mocked(api.respondConversationRequest).mockReset();
  vi.mocked(api.markConversationReadRequest).mockReset().mockResolvedValue(undefined);
});

describe("Conversacion — compose", () => {
  it("sends a trimmed message and clears the box", async () => {
    seedAuth();
    vi.mocked(api.getConversationWithUserRequest).mockResolvedValue(fixture());
    vi.mocked(api.sendMessageRequest).mockResolvedValue({
      conversation: {
        id: 10,
        status: "PENDING",
        initiatorId: 1,
        viewerIsInitiator: true,
        otherUser: OTHER_USER,
        lastMessage: null,
        unreadCount: 0,
        lastMessageAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      message: {
        id: 100,
        conversationId: 10,
        senderId: 1,
        text: "Hola",
        read: false,
        createdAt: new Date().toISOString(),
      },
    });

    const user = userEvent.setup();
    renderConversacion();

    const textarea = await screen.findByRole("textbox");
    await user.type(textarea, "  Hola  {Enter}");

    await waitFor(() =>
      expect(api.sendMessageRequest).toHaveBeenCalledWith("test-token", {
        recipientId: 2,
        text: "Hola",
      }),
    );
    expect((textarea as HTMLTextAreaElement).value).toBe("");
  });

  it("blocks empty sends", async () => {
    seedAuth();
    vi.mocked(api.getConversationWithUserRequest).mockResolvedValue(fixture());

    const user = userEvent.setup();
    renderConversacion();

    const textarea = await screen.findByRole("textbox");
    await user.type(textarea, "   {Enter}");

    expect(api.sendMessageRequest).not.toHaveBeenCalled();
  });
});

describe("Conversacion — pending request, recipient view", () => {
  it("shows Aceptar/Rechazar and no compose box, and Aceptar accepts the request", async () => {
    seedAuth();
    vi.mocked(api.getConversationWithUserRequest).mockResolvedValue(
      fixture({
        conversation: {
          id: 10,
          status: "PENDING",
          initiatorId: 2,
          viewerIsInitiator: false,
          otherUser: OTHER_USER,
          lastMessage: null,
          unreadCount: 1,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          messages: [
            {
              id: 1,
              conversationId: 10,
              senderId: 2,
              text: "Hola, ¿quieres colaborar?",
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );
    vi.mocked(api.respondConversationRequest).mockResolvedValue({
      id: 10,
      status: "ACCEPTED",
      initiatorId: 2,
      viewerIsInitiator: false,
      otherUser: OTHER_USER,
      lastMessage: null,
      unreadCount: 0,
      lastMessageAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    const user = userEvent.setup();
    renderConversacion();

    await screen.findByText("Ana Pérez quiere enviarte un mensaje");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() =>
      expect(api.respondConversationRequest).toHaveBeenCalledWith("test-token", 10, "ACCEPTED"),
    );
  });
});

describe("Conversacion — rejected request, initiator view", () => {
  it("disables the compose box", async () => {
    seedAuth();
    vi.mocked(api.getConversationWithUserRequest).mockResolvedValue(
      fixture({
        conversation: {
          id: 10,
          status: "REJECTED",
          initiatorId: 1,
          viewerIsInitiator: true,
          otherUser: OTHER_USER,
          lastMessage: null,
          unreadCount: 0,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          messages: [],
        },
      }),
    );

    renderConversacion();

    const textarea = await screen.findByRole("textbox");
    expect(textarea).toBeDisabled();
    expect(await screen.findByText("Esta persona no aceptó tu solicitud de mensaje.")).toBeInTheDocument();
  });
});

describe("Conversacion — mark-read", () => {
  it("marks the conversation read when there are unread messages from the other user", async () => {
    seedAuth();
    vi.mocked(api.getConversationWithUserRequest).mockResolvedValue(
      fixture({
        conversation: {
          id: 10,
          status: "ACCEPTED",
          initiatorId: 1,
          viewerIsInitiator: true,
          otherUser: OTHER_USER,
          lastMessage: null,
          unreadCount: 1,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          messages: [
            {
              id: 1,
              conversationId: 10,
              senderId: 2,
              text: "Hola",
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );

    renderConversacion();

    await waitFor(() => expect(api.markConversationReadRequest).toHaveBeenCalledWith("test-token", 10));
  });

  it("does not mark read when the newest unread message is the viewer's own", async () => {
    seedAuth();
    vi.mocked(api.getConversationWithUserRequest).mockResolvedValue(
      fixture({
        conversation: {
          id: 10,
          status: "ACCEPTED",
          initiatorId: 1,
          viewerIsInitiator: true,
          otherUser: OTHER_USER,
          lastMessage: null,
          unreadCount: 0,
          lastMessageAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          messages: [
            {
              id: 1,
              conversationId: 10,
              senderId: 1,
              text: "Hola",
              read: false,
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );

    renderConversacion();

    await screen.findByText("Hola");
    expect(api.markConversationReadRequest).not.toHaveBeenCalled();
  });
});

describe("Conversacion — unknown user", () => {
  it("renders a not-found message on a 404/400 error", async () => {
    seedAuth();
    vi.mocked(api.getConversationWithUserRequest).mockRejectedValue(new Error("not found"));

    renderConversacion("999");

    expect(await screen.findByText("Usuario no encontrado.")).toBeInTheDocument();
  });
});
