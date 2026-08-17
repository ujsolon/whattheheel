import { render, screen } from "@testing-library/react";

import Loading from "@/app/loading";

describe("Loading", () => {
  it("exposes one accessible status and hides skeleton decoration", () => {
    render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading trends");
    expect(screen.getByTestId("trend-skeletons")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });
});
