import { fireEvent, render, screen } from "@testing-library/react";
import { SignOutButton } from "@/app/components/SignOutButton";

const mockSignOut = jest.fn();
jest.mock("next-auth/react", () => ({ signOut: (...args: unknown[]) => mockSignOut(...args) }));

describe("SignOutButton", () => {
  it("signs out to the feed without a confirmation dialog", () => {
    render(<SignOutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(mockSignOut).toHaveBeenCalledWith({ callbackUrl: "/" });
  });
});
