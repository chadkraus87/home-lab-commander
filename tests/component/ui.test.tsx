import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppProvider } from "@/components/app-provider";
import { StatusBadge } from "@/components/ui";
import { DevicesPage } from "@/features/devices/devices-page";
import { createDemoSnapshot } from "@/simulation/demo-data";

describe("meaningful UI interactions", () => {
  it("renders status text in addition to color", () => {
    render(<StatusBadge status="degraded" />);
    expect(screen.getByText("degraded")).toBeVisible();
  });

  it("filters the device list and changes view", async () => {
    const user = userEvent.setup();
    render(
      <AppProvider
        initialSnapshot={createDemoSnapshot(new Date("2026-08-20T12:00:00Z"))}
      >
        <DevicesPage />
      </AppProvider>,
    );
    await user.type(screen.getByLabelText("Search devices"), "Atlas");
    expect(screen.getByText("Atlas Server")).toBeVisible();
    expect(screen.queryByText("Archive NAS")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cards" }));
    expect(screen.getByTestId("device-card")).toBeVisible();
  });
});
