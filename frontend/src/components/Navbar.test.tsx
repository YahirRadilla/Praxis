import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import Navbar from "./Navbar";
import * as api from "../services/api";
import type { Notification } from "../types/notification";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getUnreadCountRequest: vi.fn(),
    listNotificationsRequest: vi.fn(),
    markNotificationReadRequest: vi.fn(),
    markAllNotificationsReadRequest: vi.fn(),
  };
});

function notificationFixture(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    userId: 2,
    type: "ACTIVITY_ASSIGNED",
    message: "Te asignaron una actividad",
    link: "/proyectos/5/actividades/10",
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderNavbar(route = "/inicio") {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<p>Pantalla de inicio de sesión</p>} />
      <Route path="/inicio" element={<Navbar />} />
      <Route path="/proyectos/:id/actividades/:activityId" element={<p>Actividad destino</p>} />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  vi.mocked(api.getUnreadCountRequest).mockReset();
  vi.mocked(api.listNotificationsRequest).mockReset();
  vi.mocked(api.markNotificationReadRequest).mockReset().mockResolvedValue(undefined);
  vi.mocked(api.markAllNotificationsReadRequest).mockReset().mockResolvedValue(undefined);
});

describe("Navbar — unread badge", () => {
  it("shows the unread count from the API", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 3 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
    renderNavbar();

    expect(await screen.findAllByText("3")).not.toHaveLength(0);
  });

  it("caps the badge at '9+' for counts over 9", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 12 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
    renderNavbar();

    expect(await screen.findAllByText("9+")).not.toHaveLength(0);
  });

  it("shows no badge when there are no unread notifications", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);
    renderNavbar();

    await screen.findAllByLabelText("Notificaciones");
    expect(screen.queryByText("9+")).not.toBeInTheDocument();
  });
});

describe("Navbar — notification dropdown", () => {
  it("opens the list, marks an unread notification as read, and navigates to its link", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 1 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([notificationFixture()]);

    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getAllByLabelText("Notificaciones")[0]);
    const item = await screen.findByText("Te asignaron una actividad");
    await user.click(item);

    await waitFor(() => expect(api.markNotificationReadRequest).toHaveBeenCalledWith("test-token", 1));
    expect(await screen.findByText("Actividad destino")).toBeInTheDocument();
  });

  it("navigates without marking an already-read notification as read", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([notificationFixture({ read: true })]);

    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getAllByLabelText("Notificaciones")[0]);
    const item = await screen.findByText("Te asignaron una actividad");
    await user.click(item);

    expect(await screen.findByText("Actividad destino")).toBeInTheDocument();
    expect(api.markNotificationReadRequest).not.toHaveBeenCalled();
  });

  it("marks every notification as read via 'Marcar todas como leídas'", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 2 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([
      notificationFixture({ id: 1 }),
      notificationFixture({ id: 2, message: "Segunda notificación" }),
    ]);

    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getAllByLabelText("Notificaciones")[0]);
    await screen.findByText("Te asignaron una actividad");
    await user.click(screen.getByText("Marcar todas como leídas"));

    await waitFor(() => expect(api.markAllNotificationsReadRequest).toHaveBeenCalledWith("test-token"));
  });
});

describe("Navbar — logout", () => {
  it("clears the auth state and redirects to the home route", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);

    const user = userEvent.setup();
    renderNavbar();

    await user.click(screen.getByTitle("Estudiante Prueba"));
    await user.click(screen.getByRole("button", { name: "Salir" }));

    expect(await screen.findByText("Pantalla de inicio de sesión")).toBeInTheDocument();
    expect(localStorage.getItem("praxis_auth")).toBeNull();
  });
});

describe("Navbar — mobile search toggle", () => {
  it("opens and closes the mobile search form", async () => {
    seedAuth();
    vi.mocked(api.getUnreadCountRequest).mockResolvedValue({ count: 0 });
    vi.mocked(api.listNotificationsRequest).mockResolvedValue([]);

    const user = userEvent.setup();
    renderNavbar();

    expect(screen.queryAllByPlaceholderText("Buscar proyectos")).toHaveLength(1);

    await user.click(screen.getByLabelText("Buscar"));
    expect(screen.queryAllByPlaceholderText("Buscar proyectos")).toHaveLength(2);

    await user.click(screen.getByLabelText("Buscar"));
    expect(screen.queryAllByPlaceholderText("Buscar proyectos")).toHaveLength(1);
  });
});
