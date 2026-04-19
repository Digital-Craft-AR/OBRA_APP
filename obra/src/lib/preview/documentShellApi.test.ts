import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());
const mockFunctions = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: mockFrom,
    functions: mockFunctions,
  },
}));

import {
  fetchOrGenerateShell,
  isShellMetaStale,
  regenerateShell,
  type ShellMeta,
} from "@/lib/preview/documentShellApi";

function makeEbooksSelectChain(maybeSingleResult: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(maybeSingleResult);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.maybeSingle = maybeSingle;
  chain.eq = vi.fn(() => chain);
  const select = vi.fn(() => chain);
  return { select, chain };
}

const baseOpts = {
  projectId: "p1",
  ebookId: "e1",
  currentChapterCount: 2,
  currentPageSize: "a4",
  currentPageOrientation: "portrait",
};

const freshMeta: ShellMeta = {
  chapter_count: 2,
  page_size: "a4",
  page_orientation: "portrait",
  generated_at: "2026-01-01T00:00:00.000Z",
};

describe("isShellMetaStale", () => {
  it("returns true when meta is null", () => {
    expect(isShellMetaStale(null, 2, "a4", "portrait")).toBe(true);
  });

  it("returns false when meta matches", () => {
    expect(isShellMetaStale(freshMeta, 2, "a4", "portrait")).toBe(false);
  });

  it("returns true when chapter count differs", () => {
    expect(isShellMetaStale(freshMeta, 3, "a4", "portrait")).toBe(true);
  });

  it("returns true when page size differs", () => {
    expect(isShellMetaStale(freshMeta, 2, "letter", "portrait")).toBe(true);
  });

  it("returns true when orientation differs", () => {
    expect(isShellMetaStale(freshMeta, 2, "a4", "landscape")).toBe(true);
  });
});

describe("fetchOrGenerateShell", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockFunctions.invoke.mockReset();
  });

  it("returns DB shell without invoke when meta is fresh", async () => {
    const { select, chain } = makeEbooksSelectChain({
      data: { html_shell: "<html></html>", shell_meta: freshMeta },
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const result = await fetchOrGenerateShell(baseOpts);

    expect(mockFrom).toHaveBeenCalledWith("ebooks");
    expect(select).toHaveBeenCalledWith("html_shell, shell_meta");
    expect(chain.eq).toHaveBeenCalledWith("id", "e1");
    expect(mockFunctions.invoke).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      htmlShell: "<html></html>",
      shellMeta: freshMeta,
      cached: true,
      stale: false,
    });
  });

  it("returns DB shell with stale true when meta mismatches without invoke", async () => {
    const staleMeta: ShellMeta = { ...freshMeta, chapter_count: 1 };
    const { select } = makeEbooksSelectChain({
      data: { html_shell: "<html>x</html>", shell_meta: staleMeta },
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const result = await fetchOrGenerateShell(baseOpts);

    expect(mockFunctions.invoke).not.toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.stale).toBe(true);
      expect(result.cached).toBe(true);
      expect(result.htmlShell).toBe("<html>x</html>");
    }
  });

  it("invokes generate-document-template when html_shell is missing", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: null, shell_meta: null },
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const newMeta = { ...freshMeta, generated_at: "2026-02-01T00:00:00.000Z" };
    mockFunctions.invoke.mockResolvedValue({
      data: { ok: true, htmlShell: "<html>new</html>", shellMeta: newMeta },
      error: null,
    });

    const result = await fetchOrGenerateShell(baseOpts);

    expect(mockFunctions.invoke).toHaveBeenCalledWith("generate-document-template", {
      body: { projectId: "p1", ebookId: "e1" },
    });
    expect(result).toEqual({
      ok: true,
      htmlShell: "<html>new</html>",
      shellMeta: newMeta,
      cached: false,
      stale: false,
    });
  });

  it("treats whitespace-only html_shell as missing and invokes", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: "   \n  ", shell_meta: freshMeta },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockFunctions.invoke.mockResolvedValue({
      data: { ok: true, htmlShell: "<html>g</html>", shellMeta: freshMeta },
      error: null,
    });

    await fetchOrGenerateShell(baseOpts);

    expect(mockFunctions.invoke).toHaveBeenCalled();
  });

  it("returns generation_in_progress when invoke returns FunctionsHttpError with 409 JSON body", async () => {
    const response409 = new Response(JSON.stringify({ error: "generation_in_progress" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });
    const httpErr = Object.assign(new Error("Edge Function returned a non-2xx status code"), {
      name: "FunctionsHttpError",
      context: response409,
    });
    mockFunctions.invoke.mockResolvedValue({
      data: null,
      error: httpErr,
    });

    const result = await regenerateShell({ projectId: "p1", ebookId: "e1" });

    expect(result).toEqual({ ok: false, error: "generation_in_progress" });
  });
});
