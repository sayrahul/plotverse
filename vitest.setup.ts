// Vitest global setup: runs once before the test suite.

// Extends `expect` with DOM matchers (toBeInTheDocument, toHaveTextContent, ...)
import "@testing-library/jest-dom/vitest";

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import * as fc from "fast-check";

// Property-based tests run a minimum of 100 iterations by default.
// Individual tests may override numRuns via assert/check parameters.
fc.configureGlobal({ numRuns: 100 });

// Unmount React trees rendered by Testing Library after each test so DOM
// state does not leak between tests.
afterEach(() => {
  cleanup();
});
