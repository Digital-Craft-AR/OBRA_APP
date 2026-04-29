import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFrom = vi.hoisted(() => vi.fn());
const mockGetSession = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    from: mockFrom,
    auth: { getSession: mockGetSession },
  },
}));

// VITE_SUPABASE_URL is read at call time from import.meta.env
vi.stubEnv("VITE_SUPABASE_URL", "https://test.supabase.co");

import {
  fetchOrGenerateShell,
  hashChapters,
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

/** Creates a streaming NDJSON Response from an array of JSON chunks. */
function makeStreamResponse(chunks: Record<string, unknown>[], status = 200): Response {
  const body = chunks.map((c) => JSON.stringify(c)).join("\n") + "\n";
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

function mockSession(token = "test-token") {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: token } } });
}

const CONTENT_HASH = "abc123";

const baseOpts = {
  projectId: "p1",
  ebookId: "e1",
  currentChapterCount: 2,
  currentPageSize: "a4",
  currentPageOrientation: "portrait",
  currentContentHash: CONTENT_HASH,
};

const freshMeta: ShellMeta = {
  chapter_count: 2,
  page_size: "a4",
  page_orientation: "portrait",
  content_hash: CONTENT_HASH,
  generated_at: "2026-01-01T00:00:00.000Z",
};

describe("hashChapters", () => {
  it("returns a hex string", () => {
    const hash = hashChapters([{ title: "Intro", content: "<p>Hi</p>" }]);
    expect(hash).toMatch(/^[0-9a-f]+$/);
  });

  it("returns the same hash for identical input", () => {
    const chapters = [
      { title: "Cap 1", content: "<p>Texto</p>" },
      { title: "Cap 2", content: null },
    ];
    expect(hashChapters(chapters)).toBe(hashChapters(chapters));
  });

  it("returns different hashes when title changes", () => {
    const a = hashChapters([{ title: "A", content: "<p>x</p>" }]);
    const b = hashChapters([{ title: "B", content: "<p>x</p>" }]);
    expect(a).not.toBe(b);
  });

  it("returns different hashes when content changes", () => {
    const a = hashChapters([{ title: "T", content: "<p>one</p>" }]);
    const b = hashChapters([{ title: "T", content: "<p>two</p>" }]);
    expect(a).not.toBe(b);
  });

  it("treats null content the same as empty string", () => {
    expect(hashChapters([{ title: "T", content: null }])).toBe(
      hashChapters([{ title: "T", content: "" }]),
    );
  });

  it("returns different hash when chapter count changes", () => {
    const one = hashChapters([{ title: "A", content: null }]);
    const two = hashChapters([
      { title: "A", content: null },
      { title: "B", content: null },
    ]);
    expect(one).not.toBe(two);
  });

  it("returns '0' or a stable value for empty array", () => {
    const hash = hashChapters([]);
    expect(typeof hash).toBe("string");
    expect(hash.length).toBeGreaterThan(0);
  });
});

describe("isShellMetaStale", () => {
  it("returns true when meta is null", () => {
    expect(isShellMetaStale(null, 2, "a4", "portrait", CONTENT_HASH)).toBe(true);
  });

  it("returns false when meta matches", () => {
    expect(isShellMetaStale(freshMeta, 2, "a4", "portrait", CONTENT_HASH)).toBe(false);
  });

  it("returns true when chapter count differs", () => {
    expect(isShellMetaStale(freshMeta, 3, "a4", "portrait", CONTENT_HASH)).toBe(true);
  });

  it("returns true when page size differs", () => {
    expect(isShellMetaStale(freshMeta, 2, "letter", "portrait", CONTENT_HASH)).toBe(true);
  });

  it("returns true when orientation differs", () => {
    expect(isShellMetaStale(freshMeta, 2, "a4", "landscape", CONTENT_HASH)).toBe(true);
  });

  it("returns true when content hash differs", () => {
    expect(isShellMetaStale(freshMeta, 2, "a4", "portrait", "different_hash")).toBe(true);
  });
});

describe("fetchOrGenerateShell", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    mockGetSession.mockReset();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns DB shell without fetch when meta is fresh", async () => {
    const { select, chain } = makeEbooksSelectChain({
      data: { html_shell: "<html></html>", shell_meta: freshMeta },
      error: null,
    });
    mockFrom.mockReturnValue({ select });

    const result = await fetchOrGenerateShell(baseOpts);

    expect(mockFrom).toHaveBeenCalledWith("ebooks");
    expect(select).toHaveBeenCalledWith("html_shell, shell_meta");
    expect(chain.eq).toHaveBeenCalledWith("id", "e1");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
    expect(result).toEqual({
      ok: true,
      htmlShell: "<html></html>",
      shellMeta: freshMeta,
      cached: true,
      stale: false,
    });
  });

  it("calls generate endpoint when meta is stale (chapter count mismatch)", async () => {
    const staleMeta: ShellMeta = { ...freshMeta, chapter_count: 1 };
    const { select } = makeEbooksSelectChain({
      data: { html_shell: "<html>x</html>", shell_meta: staleMeta },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockSession();

    const newMeta = { ...freshMeta, generated_at: "2026-02-01T00:00:00.000Z" };
    vi.mocked(fetch).mockResolvedValue(
      makeStreamResponse([{ type: "done", htmlShell: "<html>new</html>", shellMeta: newMeta }]),
    );

    const result = await fetchOrGenerateShell(baseOpts);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://test.supabase.co/functions/v1/generate-document-template",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ projectId: "p1", ebookId: "e1" }),
      }),
    );
    expect(result).toEqual({
      ok: true,
      htmlShell: "<html>new</html>",
      shellMeta: newMeta,
      cached: false,
      stale: false,
    });
  });

  it("calls generate endpoint when meta is stale (content hash mismatch)", async () => {
    const staleMeta: ShellMeta = { ...freshMeta, content_hash: "old_hash" };
    const { select } = makeEbooksSelectChain({
      data: { html_shell: "<html>x</html>", shell_meta: staleMeta },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockSession();

    vi.mocked(fetch).mockResolvedValue(
      makeStreamResponse([{ type: "done", htmlShell: "<html>fresh</html>", shellMeta: freshMeta }]),
    );

    const result = await fetchOrGenerateShell(baseOpts);

    expect(vi.mocked(fetch)).toHaveBeenCalled();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cached).toBe(false);
  });

  it("calls generate endpoint when html_shell is missing", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: null, shell_meta: null },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockSession();

    const newMeta = { ...freshMeta, generated_at: "2026-02-01T00:00:00.000Z" };
    vi.mocked(fetch).mockResolvedValue(
      makeStreamResponse([{ type: "done", htmlShell: "<html>new</html>", shellMeta: newMeta }]),
    );

    const result = await fetchOrGenerateShell(baseOpts);

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      "https://test.supabase.co/functions/v1/generate-document-template",
      expect.objectContaining({ body: JSON.stringify({ projectId: "p1", ebookId: "e1" }) }),
    );
    expect(result).toEqual({
      ok: true,
      htmlShell: "<html>new</html>",
      shellMeta: newMeta,
      cached: false,
      stale: false,
    });
  });

  it("treats whitespace-only html_shell as missing and calls generate", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: "   \n  ", shell_meta: freshMeta },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockSession();

    vi.mocked(fetch).mockResolvedValue(
      makeStreamResponse([{ type: "done", htmlShell: "<html>g</html>", shellMeta: freshMeta }]),
    );

    await fetchOrGenerateShell(baseOpts);

    expect(vi.mocked(fetch)).toHaveBeenCalled();
  });

  it("ignores ping chunks and returns done chunk", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: null, shell_meta: null },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockSession();

    vi.mocked(fetch).mockResolvedValue(
      makeStreamResponse([
        { type: "ping", phase: 1 },
        { type: "ping", chapter: 1, total: 2 },
        { type: "ping", chapter: 2, total: 2 },
        { type: "done", htmlShell: "<html>ok</html>", shellMeta: freshMeta },
      ]),
    );

    const result = await fetchOrGenerateShell(baseOpts);

    expect(result).toEqual({
      ok: true,
      htmlShell: "<html>ok</html>",
      shellMeta: freshMeta,
      cached: false,
      stale: false,
    });
  });

  it("returns error when stream contains error chunk", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: null, shell_meta: null },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockSession();

    vi.mocked(fetch).mockResolvedValue(
      makeStreamResponse([{ type: "error", error: "chapter_generation_failed" }]),
    );

    const result = await regenerateShell({ projectId: "p1", ebookId: "e1" });

    expect(result).toEqual({ ok: false, error: "chapter_generation_failed" });
  });

  it("returns unauthorized when no session token", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: null, shell_meta: null },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const result = await regenerateShell({ projectId: "p1", ebookId: "e1" });

    expect(result).toEqual({ ok: false, error: "unauthorized" });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("returns stream_ended_unexpectedly when stream closes without done", async () => {
    const { select } = makeEbooksSelectChain({
      data: { html_shell: null, shell_meta: null },
      error: null,
    });
    mockFrom.mockReturnValue({ select });
    mockSession();

    vi.mocked(fetch).mockResolvedValue(
      makeStreamResponse([{ type: "ping", phase: 1 }]),
    );

    const result = await regenerateShell({ projectId: "p1", ebookId: "e1" });

    expect(result).toEqual({ ok: false, error: "stream_ended_unexpectedly" });
  });
});
