import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only unmounts automatically when Vitest globals are enabled,
// and they are not here. Without this, rendered providers keep their timers
// running until jsdom is torn down, and a late React update then throws
// "window is not defined".
afterEach(() => {
  cleanup();
});
