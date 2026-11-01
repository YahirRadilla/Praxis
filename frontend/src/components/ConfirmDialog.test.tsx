import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test-utils";
import ConfirmDialog from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    renderWithProviders(
      <ConfirmDialog
        open={false}
        title="Salir del equipo"
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByText("Salir del equipo")).not.toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog
        open
        title="Salir del equipo"
        description="¿Seguro que quieres salir?"
        confirmLabel="Salir"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Salir del equipo")).toBeInTheDocument();
    expect(screen.getByText("¿Seguro que quieres salir?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Salir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the cancel button is clicked", async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <ConfirmDialog open title="Quitar del proyecto" onConfirm={onConfirm} onClose={onClose} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
