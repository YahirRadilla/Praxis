import { describe, expect, it } from "vitest";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import CategoryPicker from "./CategoryPicker";
import type { Category } from "../types/project";

const CATEGORIES: Category[] = [
  { id: 1, name: "Tecnología", colorHex: "#111111", icon: "code" },
  { id: 2, name: "Salud", colorHex: "#222222", icon: "code" },
  { id: 3, name: "Educación", colorHex: "#333333", icon: "code" },
  { id: 4, name: "Arte", colorHex: "#444444", icon: "code" },
];

function ControlledCategoryPicker() {
  const [value, setValue] = useState<number[]>([]);
  return <CategoryPicker categories={CATEGORIES} value={value} onChange={setValue} />;
}

describe("CategoryPicker — max 3 selections", () => {
  it("toggles categories on and off up to the cap", async () => {
    const user = userEvent.setup();
    render(<ControlledCategoryPicker />);

    await user.click(screen.getByTitle("Tecnología"));
    await user.click(screen.getByTitle("Salud"));
    await user.click(screen.getByTitle("Educación"));

    expect(screen.getByTitle("Tecnología")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTitle("Salud")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByTitle("Educación")).toHaveAttribute("aria-pressed", "true");
  });

  it("disables the remaining unselected categories once 3 are picked", async () => {
    const user = userEvent.setup();
    render(<ControlledCategoryPicker />);

    await user.click(screen.getByTitle("Tecnología"));
    await user.click(screen.getByTitle("Salud"));
    await user.click(screen.getByTitle("Educación"));

    expect(screen.getByTitle("Arte")).toBeDisabled();

    await user.click(screen.getByTitle("Arte"));
    expect(screen.getByTitle("Arte")).toHaveAttribute("aria-pressed", "false");
  });

  it("allows picking a different category after deselecting one at the cap", async () => {
    const user = userEvent.setup();
    render(<ControlledCategoryPicker />);

    await user.click(screen.getByTitle("Tecnología"));
    await user.click(screen.getByTitle("Salud"));
    await user.click(screen.getByTitle("Educación"));

    await user.click(screen.getByTitle("Tecnología"));
    expect(screen.getByTitle("Tecnología")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTitle("Arte")).not.toBeDisabled();

    await user.click(screen.getByTitle("Arte"));
    expect(screen.getByTitle("Arte")).toHaveAttribute("aria-pressed", "true");
  });
});
