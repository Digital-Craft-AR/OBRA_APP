import { describe, expect, it } from "vitest";
import { rewriteStorageSignedUrlForPublicAccess } from "./storageSignedUrl";

describe("rewriteStorageSignedUrlForPublicAccess", () => {
  it("returns null for null or empty input", () => {
    expect(rewriteStorageSignedUrlForPublicAccess(null, "http://127.0.0.1:54321")).toBeNull();
    expect(rewriteStorageSignedUrlForPublicAccess("", "http://127.0.0.1:54321")).toBeNull();
  });

  it("leaves hosted Supabase URLs unchanged", () => {
    const u = "https://abc.supabase.co/storage/v1/object/sign/project-images/x/y.jpg?token=z";
    expect(rewriteStorageSignedUrlForPublicAccess(u, "https://abc.supabase.co")).toBe(u);
  });

  it("rewrites kong internal host to the public API origin", () => {
    const signed =
      "http://kong:8000/storage/v1/object/sign/project-images/p/img.jpg?token=abc";
    const out = rewriteStorageSignedUrlForPublicAccess(signed, "http://127.0.0.1:54321");
    expect(out).toBe(
      "http://127.0.0.1:54321/storage/v1/object/sign/project-images/p/img.jpg?token=abc",
    );
  });

  it("returns original URL when public base is invalid", () => {
    const signed = "http://kong:8000/storage/v1/object/sign/b/x.jpg";
    expect(rewriteStorageSignedUrlForPublicAccess(signed, "not-a-url")).toBe(signed);
  });
});
