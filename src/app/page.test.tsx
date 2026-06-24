// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import Dashboard from "./page";
import OptimizePage from "./optimize/page";
import { DataProvider } from "@/components/DataProvider";

afterEach(cleanup);

describe("Dashboard (integration, seeded IndexedDB)", () => {
  it("renders the seeded bag with stock yardages and a report button", async () => {
    render(
      <DataProvider>
        <Dashboard />
      </DataProvider>,
    );
    // Seed loads from fake-indexeddb; the bag table fills in.
    const fiveIron = await screen.findAllByText(/5 Iron/, undefined, { timeout: 3000 });
    expect(fiveIron.length).toBeGreaterThan(0);
    expect(screen.getByText("Bag Optimization")).toBeTruthy();
    expect(screen.getByText("Download report")).toBeTruthy();
    // Bag structure surfaces the 5-iron inversion text.
    expect(screen.getAllByText(/inversion/i).length).toBeGreaterThan(0);
  });
});

describe("Optimize page (integration, seeded IndexedDB)", () => {
  it("renders the target ladder and an action summary", async () => {
    render(
      <DataProvider>
        <OptimizePage />
      </DataProvider>,
    );
    await screen.findByText("Bag optimizer", undefined, { timeout: 3000 });
    // Ladder header + at least one status badge render from the seed analysis.
    expect(screen.getAllByText(/Target carry/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Matched|Adjust|Add a club/).length).toBeGreaterThan(0);
  });
});
