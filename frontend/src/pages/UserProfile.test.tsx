import { describe, expect, it, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders, seedAuth } from "../test-utils";
import UserProfile from "./UserProfile";
import * as api from "../services/api";
import type { PublicUserProfile } from "../types/user";
import type { Project } from "../types/project";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof import("../services/api")>("../services/api");
  return {
    ...actual,
    getPublicProfileRequest: vi.fn(),
    listUserPublicProjectsRequest: vi.fn(),
    followUserRequest: vi.fn(),
    unfollowUserRequest: vi.fn(),
    updateProfileRequest: vi.fn(),
  };
});

function profileFixture(overrides: Partial<PublicUserProfile> = {}): PublicUserProfile {
  return {
    id: 7,
    name: "Autora del Avance",
    accountType: "STUDENT",
    academicProgram: "Ingeniería en Sistemas Computacionales",
    semester: 5,
    skills: ["React", "Node.js"],
    interests: ["Educación"],
    cvUrl: null,
    verified: true,
    createdAt: new Date().toISOString(),
    followerCount: 2,
    followingCount: 3,
    followedByMe: false,
    ...overrides,
  };
}

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 1,
    name: "Proyecto Agua Limpia",
    description: "Descripción",
    problemStatement: "",
    objectives: "",
    extendedInfo: null,
    visibility: "PUBLIC",
    archived: false,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerId: 7,
    teacherId: null,
    organizationId: null,
    owner: { id: 7, name: "Autora del Avance", accountType: "STUDENT" },
    teacher: null,
    organization: null,
    sdgs: [],
    categories: [],
    challenge: null,
    classGroup: null,
    ...overrides,
  };
}

function renderProfile(route = "/usuarios/7") {
  return renderWithProviders(
    <Routes>
      <Route path="/usuarios/:id" element={<UserProfile />} />
      <Route path="/perfil" element={<p>Pantalla de edición de perfil</p>} />
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  vi.mocked(api.getPublicProfileRequest).mockReset();
  vi.mocked(api.listUserPublicProjectsRequest).mockReset();
  vi.mocked(api.followUserRequest).mockReset();
  vi.mocked(api.unfollowUserRequest).mockReset();
  vi.mocked(api.updateProfileRequest).mockReset();
  vi.mocked(api.listUserPublicProjectsRequest).mockResolvedValue([]);
});

describe("UserProfile", () => {
  it("renders name, account type, semester, chips, and projects for a student fixture", async () => {
    seedAuth({ id: 1 });
    vi.mocked(api.getPublicProfileRequest).mockResolvedValue(profileFixture());
    vi.mocked(api.listUserPublicProjectsRequest).mockResolvedValue([projectFixture()]);

    renderProfile();

    expect(await screen.findByRole("heading", { name: "Autora del Avance" })).toBeInTheDocument();
    expect(screen.getByText("Estudiante")).toBeInTheDocument();
    expect(screen.getByText("5° semestre")).toBeInTheDocument();
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("Node.js")).toBeInTheDocument();
    expect(screen.getByText("Educación")).toBeInTheDocument();
    expect(await screen.findByText("Proyecto Agua Limpia")).toBeInTheDocument();
  });

  it("opens the CV in the in-page PDF viewer when clicking 'Ver CV'", async () => {
    seedAuth({ id: 1 });
    vi.mocked(api.getPublicProfileRequest).mockResolvedValue(
      profileFixture({ cvUrl: "https://cdn.example.com/cv.pdf" }),
    );
    const user = userEvent.setup();

    renderProfile();

    await user.click(await screen.findByRole("button", { name: "Ver CV" }));

    const iframe = await screen.findByTitle(/CV de/i);
    expect(iframe).toHaveAttribute("src", "https://cdn.example.com/cv.pdf");
  });

  it("follows the user when clicking 'Seguir'", async () => {
    seedAuth({ id: 1 });
    vi.mocked(api.getPublicProfileRequest).mockResolvedValue(profileFixture({ followedByMe: false }));
    vi.mocked(api.followUserRequest).mockResolvedValue({ following: true });

    const user = userEvent.setup();
    renderProfile();

    const followButton = await screen.findByRole("button", { name: "Seguir" });
    await user.click(followButton);

    await waitFor(() => expect(api.followUserRequest).toHaveBeenCalledWith("test-token", 7));
  });

  it("shows 'Enviar mensaje' linking to the conversation with that user", async () => {
    seedAuth({ id: 1 });
    vi.mocked(api.getPublicProfileRequest).mockResolvedValue(profileFixture());

    renderProfile();

    const link = await screen.findByRole("link", { name: "Enviar mensaje" });
    expect(link).toHaveAttribute("href", "/mensajes/7");
  });

  it("hides 'Enviar mensaje' on your own profile", async () => {
    seedAuth({ id: 7 });
    vi.mocked(api.getPublicProfileRequest).mockResolvedValue(profileFixture({ id: 7 }));

    renderProfile("/usuarios/7");

    await screen.findByRole("heading", { name: "Autora del Avance" });
    expect(screen.queryByRole("link", { name: "Enviar mensaje" })).not.toBeInTheDocument();
  });

  it("shows 'Editar perfil' and the CV uploader, and hides the follow button, on your own profile", async () => {
    seedAuth({ id: 7 });
    vi.mocked(api.getPublicProfileRequest).mockResolvedValue(profileFixture({ id: 7 }));

    renderProfile("/usuarios/7");

    expect(await screen.findByRole("link", { name: "Editar perfil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subir CV" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Seguir" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Siguiendo" })).not.toBeInTheDocument();
  });

  it("renders 'Usuario no encontrado.' when the profile request fails", async () => {
    seedAuth({ id: 1 });
    vi.mocked(api.getPublicProfileRequest).mockRejectedValue(new Error("not found"));

    renderProfile();

    expect(await screen.findByText("Usuario no encontrado.")).toBeInTheDocument();
  });
});
