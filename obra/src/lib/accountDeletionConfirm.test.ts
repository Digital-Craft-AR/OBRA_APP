import { afterEach, describe, expect, it, vi } from "vitest";
import { confirmAccountDeletionInBrowser } from "./accountDeletionConfirm";

const t = ((key: string) => key) as import("i18next").TFunction;

describe("confirmAccountDeletionInBrowser", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns false when the first confirm is dismissed", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    expect(confirmAccountDeletionInBrowser("a@b.com", t)).toBe(false);
    expect(confirmSpy).toHaveBeenCalledOnce();
    confirmSpy.mockRestore();
  });

  it("returns false when email is missing", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    expect(confirmAccountDeletionInBrowser(null, t)).toBe(false);
    expect(confirmAccountDeletionInBrowser("  ", t)).toBe(false);
    alertSpy.mockRestore();
  });

  it("returns false when typed email does not match", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "prompt").mockReturnValue("wrong@b.com");
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    expect(confirmAccountDeletionInBrowser("a@b.com", t)).toBe(false);
    alertSpy.mockRestore();
  });

  it("returns true when typed email matches case-insensitively", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(window, "prompt").mockReturnValue("A@B.COM");
    expect(confirmAccountDeletionInBrowser("a@b.com", t)).toBe(true);
  });
});
