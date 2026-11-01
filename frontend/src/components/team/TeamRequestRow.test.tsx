import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import TeamRequestRow from "./TeamRequestRow";
import type { TeamRequest } from "../../types/team";

function requestFixture(overrides: Partial<TeamRequest> = {}): TeamRequest {
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
    ...overrides,
  };
}

describe("TeamRequestRow", () => {
  it("calls onAccept when the Aceptar button is clicked", async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(<TeamRequestRow request={requestFixture()} onAccept={onAccept} onReject={onReject} />);

    await user.click(screen.getByRole("button", { name: "Aceptar" }));

    expect(onAccept).toHaveBeenCalledTimes(1);
    expect(onReject).not.toHaveBeenCalled();
  });

  it("calls onReject when the Rechazar button is clicked", async () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();
    const user = userEvent.setup();
    render(<TeamRequestRow request={requestFixture()} onAccept={onAccept} onReject={onReject} />);

    await user.click(screen.getByRole("button", { name: "Rechazar" }));

    expect(onReject).toHaveBeenCalledTimes(1);
    expect(onAccept).not.toHaveBeenCalled();
  });

  it("labels an OWNER-initiated EVALUATOR invite distinctly from a join request", () => {
    render(
      <TeamRequestRow
        request={requestFixture({ initiatedBy: "OWNER", purpose: "EVALUATOR" })}
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />,
    );
    expect(screen.getByText("Te invitan como evaluador")).toBeInTheDocument();
  });

  it("shows no purpose badge for a plain REQUESTER-initiated join request", () => {
    render(<TeamRequestRow request={requestFixture()} onAccept={vi.fn()} onReject={vi.fn()} />);
    expect(screen.queryByText(/te invitan/i)).not.toBeInTheDocument();
  });
});
