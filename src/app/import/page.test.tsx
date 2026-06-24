// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// Router + file parsing are environment concerns; mock them so the test focuses
// on the upload -> map -> confirm wiring (the transform is unit-tested elsewhere).
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/import/csv", () => ({
  parseCsvFile: vi.fn(async () => ({
    headers: ["Club", "Carry"],
    rows: [
      { Club: "7 Iron", Carry: "162" },
      { Club: "6 Iron", Carry: "178" },
    ],
  })),
  columnValues: () => [],
}));

import ImportPage from "./page";
import { DataProvider } from "@/components/DataProvider";

afterEach(cleanup);

describe("Import flow (upload -> map -> confirm)", () => {
  it("parses a file, auto-maps columns, and imports shots", async () => {
    const { container } = render(
      <DataProvider>
        <ImportPage />
      </DataProvider>,
    );

    // Upload: feed a file to the (hidden) input.
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["unused"], "shots.csv", { type: "text/csv" });
    fireEvent.change(input, { target: { files: [file] } });

    // Map step appears with the auto-detected mapping.
    await screen.findByText(/Map columns/, undefined, { timeout: 3000 });

    // Confirm.
    fireEvent.click(screen.getByText(/Import 2 rows/));

    // Done screen reports the imported shots.
    await screen.findByText(/Imported 2 shots/, undefined, { timeout: 3000 });
  });
});
