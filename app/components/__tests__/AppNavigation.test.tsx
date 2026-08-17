import { render, screen } from "@testing-library/react";

import { AppNavigation } from "@/app/components/AppNavigation";

describe("AppNavigation", () => {
  it("renders the three product surfaces without broken future links", () => {
    render(<AppNavigation />);

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByText("Feed")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "AI Stylist (coming soon)" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Profile (coming soon)" })).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
