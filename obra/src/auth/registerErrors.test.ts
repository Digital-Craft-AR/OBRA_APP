import { describe, expect, it } from "vitest";
import { mapSignUpErrorToKey } from "./registerErrors";

describe("mapSignUpErrorToKey", () => {
  it("detects duplicate registration", () => {
    expect(mapSignUpErrorToKey("User already registered")).toBe("registerAlreadyExists");
  });

  it("detects weak password hints", () => {
    expect(mapSignUpErrorToKey("Password should be at least 8 characters.")).toBe("registerPasswordWeak");
  });

  it("falls back to generic register error", () => {
    expect(mapSignUpErrorToKey("Something went wrong")).toBe("registerError");
  });
});
