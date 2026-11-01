import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import SolicitudesRecibidas from "./SolicitudesRecibidas";
import * as api from "../services/api";
import type { ReceivedTeamRequest } from "../types/team";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    listReceivedRequestsRequest: vi.fn(),
    listReceivedInvitesRequest: vi.fn(),
    respondToRequestRequest: vi.fn(),
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
  };
});

function requestFixture(overrides: Partial<ReceivedTeamRequest> = {}): ReceivedTeamRequest {
  return {
    id: 1,
    projectId: 10,
    userId: 20,
    role: "COLLABORATOR",
    purpose: "MEMBER",
    initiatedBy: "REQUESTER",
    status: "PENDING",
    message: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    user: { id: 20, name: "Estudiante Uno", email: "e1@uabcs.mx", accountType: "STUDENT" },
    project: { id: 10, name: "Proyecto Agua" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
  vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
  vi.mocked(api.listReceivedInvitesRequest).mockResolvedValue([]);
  vi.mocked(api.respondToRequestRequest).mockReset();
  seedAuth();
});

describe("SolicitudesRecibidas", () => {
  it("accepting a request calls respondToRequestRequest with status ACCEPTED", async () => {
    vi.mocked(api.listReceivedRequestsRequest).mockResolvedValue([requestFixture()]);
    vi.mocked(api.respondToRequestRequest).mockResolvedValue({
      ...requestFixture(),
      status: "ACCEPTED",
    });

    const user = userEvent.setup();
    renderWithProviders(<SolicitudesRecibidas />);

    await screen.findByText("Estudiante Uno");
    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    await waitFor(() => {
      expect(api.respondToRequestRequest).toHaveBeenCalledWith("test-token", 1, "ACCEPTED");
    });
  });

  it("rejecting a request calls respondToRequestRequest with status REJECTED", async () => {
    vi.mocked(api.listReceivedRequestsRequest).mockResolvedValue([requestFixture()]);
    vi.mocked(api.respondToRequestRequest).mockResolvedValue({
      ...requestFixture(),
      status: "REJECTED",
    });

    const user = userEvent.setup();
    renderWithProviders(<SolicitudesRecibidas />);

    await screen.findByText("Estudiante Uno");
    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    await waitFor(() => {
      expect(api.respondToRequestRequest).toHaveBeenCalledWith("test-token", 1, "REJECTED");
    });
  });

  it("shows the empty-state message when there are no pending requests", async () => {
    vi.mocked(api.listReceivedRequestsRequest).mockResolvedValue([]);
    renderWithProviders(<SolicitudesRecibidas />);

    expect(
      await screen.findByText("No tienes solicitudes pendientes en tus proyectos."),
    ).toBeInTheDocument();
  });
});
