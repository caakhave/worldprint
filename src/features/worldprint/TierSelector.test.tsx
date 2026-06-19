import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TierSelector } from "@/features/worldprint/TierSelector";

describe("TierSelector", () => {
  it("lets players select a tier", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TierSelector value="analyst" onChange={onChange} />);
    await user.click(screen.getByLabelText(/Cartographer/i));
    expect(onChange).toHaveBeenCalledWith("cartographer");
  });

  it("marks Analyst as recommended and explains tier differences", () => {
    render(<TierSelector value="analyst" onChange={() => undefined} />);
    expect(screen.getByText("Recommended")).toBeInTheDocument();
    expect(screen.getByText(/3 broad choices/i)).toBeInTheDocument();
    expect(screen.getByText(/4 plausible choices/i)).toBeInTheDocument();
    expect(screen.getByText(/6 close choices/i)).toBeInTheDocument();
    expect(screen.getByText(/No visible answer choices/i)).toBeInTheDocument();
  });
});
