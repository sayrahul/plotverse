import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import * as fc from "fast-check";

// Sanity checks that the testing toolchain is wired correctly.
// These verify Vitest, jsdom, Testing Library, jest-dom matchers,
// user-event, and fast-check property testing are all operational.

describe("testing toolchain", () => {
  it("runs Vitest with globals and expect", () => {
    expect(1 + 1).toBe(2);
  });

  it("renders a React component in jsdom and uses jest-dom matchers", () => {
    render(<button type="button">Click me</button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("handles user-event interactions", async () => {
    function Counter() {
      const [count, setCount] = useState(0);
      return (
        <button type="button" onClick={() => setCount((c) => c + 1)}>
          count: {count}
        </button>
      );
    }

    const user = userEvent.setup();
    render(<Counter />);
    const button = screen.getByRole("button");
    await user.click(button);
    await user.click(button);
    expect(button).toHaveTextContent("count: 2");
  });

  it("runs fast-check property tests (commutativity of addition)", () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer(), (a, b) => {
        return a + b === b + a;
      })
    );
  });
});
