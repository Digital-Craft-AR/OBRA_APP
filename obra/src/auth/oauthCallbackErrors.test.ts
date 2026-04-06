import { describe, expect, it } from "vitest";
import { classifyOAuthCallbackError, formatOAuthCallbackUserMessage } from "./oauthCallbackErrors";

describe("classifyOAuthCallbackError", () => {
  it("treats access_denied as cancelled", () => {
    expect(classifyOAuthCallbackError("access_denied")).toBe("cancelled");
  });

  it("treats server_error as server", () => {
    expect(classifyOAuthCallbackError("server_error")).toBe("server");
  });

  it("treats unknown codes as unknown", () => {
    expect(classifyOAuthCallbackError("invalid_request")).toBe("unknown");
  });
});

describe("formatOAuthCallbackUserMessage", () => {
  const t = (key: string) => (key === "auth.oauthCancelled" ? "CANCELLED" : key);

  it("does not append provider detail for user-cancelled flow", () => {
    expect(formatOAuthCallbackUserMessage(t, "cancelled", "User cancelled")).toBe("CANCELLED");
  });
});
