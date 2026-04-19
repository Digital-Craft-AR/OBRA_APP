import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Supabase mock — must be hoisted so vi.mock factory runs before imports
// ---------------------------------------------------------------------------
const mockStorage = vi.hoisted(() => ({
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
}));

const mockFrom = vi.hoisted(() => vi.fn());
const mockFunctions = vi.hoisted(() => ({ invoke: vi.fn() }));
const mockAuth = vi.hoisted(() => ({ getSession: vi.fn() }));

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: mockStorage.upload,
        createSignedUrl: mockStorage.createSignedUrl,
      }),
    },
    from: mockFrom,
    functions: mockFunctions,
    auth: mockAuth,
  },
}));

import {
  generateImage,
  getSignedImageUrl,
  loadProjectImages,
  uploadImage,
} from "@/lib/preview/imageSlotApi";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a self-referential Supabase select chain mock.
 *
 * All builder methods (eq, is, order, in) return the same `chain` object so
 * arbitrarily-deep call sequences like `.eq(...).eq(...).is(...).is(...)` work
 * correctly without having to know the exact depth in advance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeSelectChain(maybySingleResult: unknown): { select: ReturnType<typeof vi.fn>; chain: any } {
  const maybeSingle = vi.fn().mockResolvedValue(maybySingleResult);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  chain.maybeSingle = maybeSingle;
  chain.single = vi.fn().mockResolvedValue(maybySingleResult);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.in = vi.fn(() => chain);

  const select = vi.fn(() => chain);
  return { select, chain };
}

function makeUpdateChain(result: unknown) {
  const eq = vi.fn().mockResolvedValue(result);
  const update = vi.fn(() => ({ eq }));
  return { update, eq };
}

function makeInsertChain(result: unknown) {
  const insert = vi.fn().mockResolvedValue(result);
  return { insert };
}

// ---------------------------------------------------------------------------
// loadProjectImages
// ---------------------------------------------------------------------------

describe("loadProjectImages", () => {
  it("returns rows on success", async () => {
    const rows = [{ id: "img-1", project_id: "p1", slot_key: "cover_art", status: "done" }];
    const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const result = await loadProjectImages("p1");

    expect(result).toEqual({ ok: true, rows });
    expect(eq).toHaveBeenCalledWith("project_id", "p1");
  });

  it("returns { ok: false } on supabase error", async () => {
    const eq = vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } });
    const select = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ select });

    const result = await loadProjectImages("p1");
    expect(result).toEqual({ ok: false });
  });
});

// ---------------------------------------------------------------------------
// getSignedImageUrl
// ---------------------------------------------------------------------------

describe("getSignedImageUrl", () => {
  beforeEach(() => {
    mockStorage.createSignedUrl.mockClear();
  });

  it("returns signed URL on success", async () => {
    mockStorage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn.example.com/img.png" },
      error: null,
    });

    const url = await getSignedImageUrl("project-1/cover_art.png");
    expect(url).toBe("https://cdn.example.com/img.png");
  });

  it("returns null when storage errors", async () => {
    mockStorage.createSignedUrl.mockResolvedValue({ data: null, error: { message: "not found" } });
    const url = await getSignedImageUrl("missing/path.png");
    expect(url).toBeNull();
  });

  it("returns null when signedUrl is absent in data", async () => {
    mockStorage.createSignedUrl.mockResolvedValue({ data: {}, error: null });
    const url = await getSignedImageUrl("project-1/cover_art.png");
    expect(url).toBeNull();
  });

  it("returns null for whitespace-only path", async () => {
    const url = await getSignedImageUrl("   \n  ");
    expect(url).toBeNull();
    expect(mockStorage.createSignedUrl).not.toHaveBeenCalled();
  });

  it("strips project-images/ prefix and leading slashes before signing", async () => {
    mockStorage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn.example.com/x.png" },
      error: null,
    });

    const url = await getSignedImageUrl(" /PROJECT-IMAGES/a1b2c3d4-e5f6-7890-abcd-ef1234567890/img.jpg ");
    expect(url).toBe("https://cdn.example.com/x.png");
    expect(mockStorage.createSignedUrl).toHaveBeenCalledWith(
      "a1b2c3d4-e5f6-7890-abcd-ef1234567890/img.jpg",
      3600,
    );
  });
});

// ---------------------------------------------------------------------------
// generateImage
// ---------------------------------------------------------------------------

describe("generateImage", () => {
  beforeEach(() => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: "tok-abc" } },
    });
  });

  it("returns ok result when function succeeds", async () => {
    mockFunctions.invoke.mockResolvedValue({
      data: { ok: true, imageId: "img-99", signedUrl: "https://cdn/img.png", credits_balance_after: 7 },
      error: null,
    });

    const result = await generateImage({ projectId: "p1", slotKey: "cover_art" });
    expect(result).toEqual({
      ok: true,
      imageId: "img-99",
      signedUrl: "https://cdn/img.png",
      credits_balance_after: 7,
    });
    expect(mockFunctions.invoke).toHaveBeenCalledWith(
      "image-generate",
      expect.objectContaining({
        body: expect.objectContaining({ projectId: "p1", slotKey: "cover_art" }),
      }),
    );
  });

  it("returns unauthenticated when no session token", async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    const result = await generateImage({ projectId: "p1", slotKey: "cover_art" });
    expect(result).toEqual({ ok: false, code: "unauthenticated" });
  });

  it("returns invoke_error when function call fails", async () => {
    mockFunctions.invoke.mockResolvedValue({ data: null, error: { message: "timeout" } });
    const result = await generateImage({ projectId: "p1", slotKey: "cover_art" });
    expect(result).toEqual({ ok: false, code: "invoke_error" });
  });

  it("returns error code from data when data.ok is false", async () => {
    mockFunctions.invoke.mockResolvedValue({
      data: { ok: false, error: "gemini_http_429" },
      error: null,
    });
    const result = await generateImage({ projectId: "p1", slotKey: "cover_art" });
    expect(result).toEqual({ ok: false, code: "gemini_http_429" });
  });

  it("forwards optional fields (ebookId, chapterId, instruction) in payload", async () => {
    mockFunctions.invoke.mockResolvedValue({
      data: { ok: true, imageId: "x", signedUrl: null, credits_balance_after: null },
      error: null,
    });
    await generateImage({
      projectId: "p1",
      slotKey: "hero",
      ebookId: "eb-1",
      chapterId: "ch-1",
      instruction: "Make it blue",
    });
    expect(mockFunctions.invoke).toHaveBeenCalledWith(
      "image-generate",
      expect.objectContaining({
        body: { projectId: "p1", slotKey: "hero", ebookId: "eb-1", chapterId: "ch-1", instruction: "Make it blue" },
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// uploadImage — success paths
// ---------------------------------------------------------------------------

describe("uploadImage — cover_art (no ebookId/chapterId)", () => {
  const file = new File(["data"], "cover.jpg", { type: "image/jpeg" });

  it("inserts a new row and returns signed URL when no existing row", async () => {
    // Storage upload succeeds
    mockStorage.upload.mockResolvedValue({ error: null });
    // Signed URL succeeds
    mockStorage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn/cover.jpg" },
      error: null,
    });

    // SELECT returns no existing row
    const { select } = makeSelectChain({ data: null, error: null });
    // INSERT succeeds
    const insertChain = makeInsertChain({ error: null });

    mockFrom.mockImplementation((_table: string) => ({
      select,
      insert: insertChain.insert,
    }));

    const result = await uploadImage({ projectId: "p1", slotKey: "cover_art", file });

    expect(result).toEqual({
      ok: true,
      signedUrl: "https://cdn/cover.jpg",
      storagePath: "p1/cover_art.jpg",
    });
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: "p1", slot_key: "cover_art", status: "done" }),
    );
  });

  it("updates existing row when one already exists", async () => {
    mockStorage.upload.mockResolvedValue({ error: null });
    mockStorage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn/cover.jpg" },
      error: null,
    });

    const existingId = "existing-img-id";
    const { select } = makeSelectChain({ data: { id: existingId }, error: null });
    const updateChain = makeUpdateChain({ error: null });

    mockFrom.mockImplementation((_table: string) => ({
      select,
      update: updateChain.update,
    }));

    const result = await uploadImage({ projectId: "p1", slotKey: "cover_art", file });

    expect(result.ok).toBe(true);
    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({ storage_path: "p1/cover_art.jpg", status: "done" }),
    );
    expect(updateChain.eq).toHaveBeenCalledWith("id", existingId);
  });
});

// ---------------------------------------------------------------------------
// uploadImage — error paths
// ---------------------------------------------------------------------------

describe("uploadImage — error paths", () => {
  const file = new File(["data"], "cover.png", { type: "image/png" });

  it("returns upload_failed when storage upload errors", async () => {
    mockStorage.upload.mockResolvedValue({ error: { message: "quota exceeded" } });

    const result = await uploadImage({ projectId: "p1", slotKey: "cover_art", file });
    expect(result).toEqual({ ok: false, code: "upload_failed" });
  });

  it("returns db_update_failed when UPDATE errors", async () => {
    mockStorage.upload.mockResolvedValue({ error: null });
    mockStorage.createSignedUrl.mockResolvedValue({ data: { signedUrl: "x" }, error: null });

    const { select } = makeSelectChain({ data: { id: "img-1" }, error: null });
    const updateChain = makeUpdateChain({ error: { message: "constraint" } });

    mockFrom.mockImplementation(() => ({
      select,
      update: updateChain.update,
    }));

    const result = await uploadImage({ projectId: "p1", slotKey: "cover_art", file });
    expect(result).toEqual({ ok: false, code: "db_update_failed" });
  });

  it("returns db_insert_failed when INSERT errors", async () => {
    mockStorage.upload.mockResolvedValue({ error: null });
    mockStorage.createSignedUrl.mockResolvedValue({ data: { signedUrl: "x" }, error: null });

    const { select } = makeSelectChain({ data: null, error: null });
    const insertChain = makeInsertChain({ error: { message: "violation" } });

    mockFrom.mockImplementation(() => ({
      select,
      insert: insertChain.insert,
    }));

    const result = await uploadImage({ projectId: "p1", slotKey: "cover_art", file });
    expect(result).toEqual({ ok: false, code: "db_insert_failed" });
  });

  it("returns signed_url_failed when createSignedUrl errors after successful insert", async () => {
    mockStorage.upload.mockResolvedValue({ error: null });
    mockStorage.createSignedUrl.mockResolvedValue({ data: null, error: { message: "not found" } });

    const { select } = makeSelectChain({ data: null, error: null });
    const insertChain = makeInsertChain({ error: null });

    mockFrom.mockImplementation(() => ({
      select,
      insert: insertChain.insert,
    }));

    const result = await uploadImage({ projectId: "p1", slotKey: "cover_art", file });
    expect(result).toEqual({ ok: false, code: "signed_url_failed" });
  });
});

// ---------------------------------------------------------------------------
// uploadImage — storagePath derivation
// ---------------------------------------------------------------------------

describe("uploadImage — storagePath derivation", () => {
  it("builds path with ebookId + chapterId when both provided (per-chapter hero)", async () => {
    const file = new File(["d"], "hero.webp", { type: "image/webp" });
    mockStorage.upload.mockResolvedValue({ error: null });
    mockStorage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn/hero.webp" },
      error: null,
    });

    const { select } = makeSelectChain({ data: null, error: null });
    const insertChain = makeInsertChain({ error: null });
    mockFrom.mockImplementation(() => ({
      select,
      insert: insertChain.insert,
    }));

    const result = await uploadImage({
      projectId: "p1",
      slotKey: "hero",
      file,
      ebookId: "eb-2",
      chapterId: "ch-77",
    });

    expect(result.ok && result.storagePath).toBe("p1/eb-2/ch-77/hero.webp");
    expect(mockStorage.upload).toHaveBeenCalledWith(
      "p1/eb-2/ch-77/hero.webp",
      file,
      expect.objectContaining({ upsert: true }),
    );
  });

  it("builds path with ebookId only when chapterId is omitted", async () => {
    const file = new File(["d"], "hero.webp", { type: "image/webp" });
    mockStorage.upload.mockResolvedValue({ error: null });
    mockStorage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn/hero.webp" },
      error: null,
    });

    const { select } = makeSelectChain({ data: null, error: null });
    const insertChain = makeInsertChain({ error: null });
    mockFrom.mockImplementation(() => ({
      select,
      insert: insertChain.insert,
    }));

    const result = await uploadImage({
      projectId: "p1",
      slotKey: "hero",
      file,
      ebookId: "eb-2",
    });

    expect(result.ok && result.storagePath).toBe("p1/eb-2/hero.webp");
    expect(mockStorage.upload).toHaveBeenCalledWith(
      "p1/eb-2/hero.webp",
      file,
      expect.objectContaining({ upsert: true }),
    );
  });

  it("normalises uppercase extension to lowercase in storagePath", async () => {
    const file = new File(["d"], "cover.JPG", { type: "image/jpeg" });
    mockStorage.upload.mockResolvedValue({ error: null });
    mockStorage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: "https://cdn/cover.jpg" },
      error: null,
    });

    const { select } = makeSelectChain({ data: null, error: null });
    const insertChain = makeInsertChain({ error: null });
    mockFrom.mockImplementation(() => ({
      select,
      insert: insertChain.insert,
    }));

    const result = await uploadImage({ projectId: "p1", slotKey: "cover_art", file });
    expect(result.ok && result.storagePath).toBe("p1/cover_art.jpg");
  });
});
