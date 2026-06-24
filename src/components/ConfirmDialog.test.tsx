// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

afterEach(cleanup);

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog open={false} title="Hidden" actions={[]} onCancel={() => {}} />,
    );
    expect(screen.queryByText("Hidden")).toBeNull();
  });

  it("shows title/body and runs an action on click", () => {
    const onAct = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="Delete all data?"
        body="This cannot be undone."
        actions={[{ label: "Delete everything", variant: "danger", onClick: onAct }]}
        onCancel={onCancel}
      />,
    );
    expect(screen.getByRole("dialog").getAttribute("aria-modal")).toBe("true");
    expect(screen.getByText("This cannot be undone.")).toBeTruthy();
    fireEvent.click(screen.getByText("Delete everything"));
    expect(onAct).toHaveBeenCalledTimes(1);
  });

  it("cancels via the Cancel button and via Escape", () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog open title="Confirm" actions={[]} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it("moves focus into the dialog on open", () => {
    render(
      <ConfirmDialog
        open
        title="Focus me"
        actions={[{ label: "OK", onClick: () => {} }]}
        onCancel={() => {}}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});
