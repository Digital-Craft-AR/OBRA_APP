import type { User } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { isEmailVerifiedForEntitlement } from "./authEmailEntitlement";

function minimalUser(partial: Partial<User> & Pick<User, "id" | "aud" | "created_at">): User {
  return {
    app_metadata: {},
    user_metadata: {},
    ...partial,
  } as User;
}

describe("isEmailVerifiedForEntitlement", () => {
  it("returns false when user is null", () => {
    expect(isEmailVerifiedForEntitlement(null)).toBe(false);
  });

  it("returns false without email_confirmed_at", () => {
    expect(
      isEmailVerifiedForEntitlement(
        minimalUser({ id: "1", aud: "a", created_at: "", email: "a@b.com" }),
      ),
    ).toBe(false);
  });

  it("returns false when confirmed but new_email is pending", () => {
    expect(
      isEmailVerifiedForEntitlement(
        minimalUser({
          id: "1",
          aud: "a",
          created_at: "",
          email: "a@b.com",
          email_confirmed_at: "2026-01-01T00:00:00Z",
          new_email: "pending@example.com",
        }),
      ),
    ).toBe(false);
  });

  it("returns true when confirmed and no pending new_email", () => {
    expect(
      isEmailVerifiedForEntitlement(
        minimalUser({
          id: "1",
          aud: "a",
          created_at: "",
          email: "a@b.com",
          email_confirmed_at: "2026-01-01T00:00:00Z",
        }),
      ),
    ).toBe(true);
  });
});
