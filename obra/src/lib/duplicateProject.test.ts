import { describe, expect, it } from "vitest";
import { duplicateProjectName, duplicateProjectNameSuffix } from "./duplicateProject";

describe("duplicateProjectNameSuffix", () => {
  it("returns Spanish suffix for es locale", () => {
    expect(duplicateProjectNameSuffix("es")).toBe(" - Copia");
  });

  it("returns Portuguese suffix for pt-BR locale", () => {
    expect(duplicateProjectNameSuffix("pt-BR")).toBe(" - Cópia");
  });

  it("returns English suffix for en-US locale", () => {
    expect(duplicateProjectNameSuffix("en-US")).toBe(" - Copy");
  });

  it("returns English suffix for en-GB locale", () => {
    expect(duplicateProjectNameSuffix("en-GB")).toBe(" - Copy");
  });

  it("falls back to Spanish suffix for unknown locale", () => {
    expect(duplicateProjectNameSuffix("fr")).toBe(" - Copia");
  });
});

describe("duplicateProjectName", () => {
  it("appends the correct suffix to the project name", () => {
    expect(duplicateProjectName("Mi proyecto", "es")).toBe("Mi proyecto - Copia");
    expect(duplicateProjectName("Meu projeto", "pt-BR")).toBe("Meu projeto - Cópia");
    expect(duplicateProjectName("My project", "en-US")).toBe("My project - Copy");
    expect(duplicateProjectName("My project", "en-GB")).toBe("My project - Copy");
  });

  it("handles empty name", () => {
    expect(duplicateProjectName("", "es")).toBe(" - Copia");
  });
});
