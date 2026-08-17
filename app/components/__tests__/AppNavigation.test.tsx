import { render, screen } from "@testing-library/react";

import { AppNavigation } from "@/app/components/AppNavigation";

describe("AppNavigation", () => {
  it("renders the three product surfaces without broken future links", () => {
    render(<AppNavigation />);

    expect(screen.getByRole("navigation", { name: "Primary" })).toBeInTheDocument();
    expect(screen.getByText("Feed")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "AI Stylist" })).toHaveAttribute("href", "/stylist");
    expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute("href", "/profile");
  });
});
