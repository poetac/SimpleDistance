// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { DataProvider, useData } from "./DataProvider";

afterEach(cleanup);

function Probe() {
  const { loading, analysis, settings, updateSettings, shots, clearAll, undo, runUndo } =
    useData();
  if (loading) return <div>loading</div>;
  const five = analysis?.clubs.find((c) => c.club === "5I");
  return (
    <div>
      <div>clubs:{analysis?.clubs.length ?? 0}</div>
      <div>shots:{shots.length}</div>
      <div>fiveTrend:{five?.trend.classification ?? "none"}</div>
      <div>metric:{settings.metric}</div>
      <div>undo:{undo?.label ?? "none"}</div>
      <button onClick={() => updateSettings({ ...settings, metric: "total" })}>
        use total
      </button>
      <button onClick={() => clearAll()}>clear all</button>
      <button onClick={() => runUndo()}>do undo</button>
    </div>
  );
}

describe("DataProvider (IndexedDB integration)", () => {
  it("auto-seeds and exposes a full bag analysis", async () => {
    render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );

    // Seed loads asynchronously from (fake) IndexedDB.
    const clubs = await screen.findByText(/^clubs:/, undefined, { timeout: 3000 });
    const count = Number(clubs.textContent!.split(":")[1]);
    expect(count).toBeGreaterThanOrEqual(10);

    // The seeded 5-iron is classified as a real trend end-to-end through the store.
    expect(screen.getByText("fiveTrend:real-trend")).toBeTruthy();
  });

  it("persists a settings change", async () => {
    render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );
    await screen.findByText(/^clubs:/, undefined, { timeout: 3000 });
    expect(screen.getByText("metric:carry")).toBeTruthy();

    fireEvent.click(screen.getByText("use total"));
    await waitFor(() => expect(screen.getByText("metric:total")).toBeTruthy());
  });

  it("offers undo after clearing all data and restores the snapshot", async () => {
    render(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );
    await screen.findByText(/^clubs:/, undefined, { timeout: 3000 });
    const before = Number(screen.getByText(/^shots:/).textContent!.split(":")[1]);
    expect(before).toBeGreaterThan(0);
    expect(screen.getByText("undo:none")).toBeTruthy();

    fireEvent.click(screen.getByText("clear all"));
    await waitFor(() => expect(screen.getByText("shots:0")).toBeTruthy());
    expect(screen.getByText("undo:All data cleared")).toBeTruthy();

    fireEvent.click(screen.getByText("do undo"));
    await waitFor(() =>
      expect(Number(screen.getByText(/^shots:/).textContent!.split(":")[1])).toBe(before),
    );
    expect(screen.getByText("undo:none")).toBeTruthy();
  });
});
