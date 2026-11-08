import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import FieldValidationHint from "./FieldValidationHint";

describe("FieldValidationHint", () => {
  it("renders nothing when show is false", () => {
    const { container } = render(<FieldValidationHint message="Completa este campo." show={false} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the message with the warning icon when show is true", () => {
    const { container } = render(<FieldValidationHint message="Completa este campo." show={true} />);
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(screen.getByText("Completa este campo.")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});
