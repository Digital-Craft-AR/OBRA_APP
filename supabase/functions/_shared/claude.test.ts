/**
 * Unit tests for the Claude API wrapper (claude.ts).
 *
 * These tests verify that prompt caching headers and structured system blocks
 * are sent correctly, and that the response parsing / error paths work.
 *
 * Run: deno test supabase/functions/_shared/claude.test.ts
 */
import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { callClaudeJsonText, getClaudeModel, parseJsonArray, parseJsonObject } from "./claude.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

interface CapturedRequest {
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** Replace globalThis.fetch for a single test; returns captured request info. */
function mockFetch(
  responseBody: unknown,
  status = 200,
): { captured: CapturedRequest | null; restore: () => void } {
  const state: { captured: CapturedRequest | null } = { captured: null };
  const original = globalThis.fetch;
  globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init?.body as string ?? "{}") as Record<string, unknown>;
    const headers: Record<string, string> = {};
    if (init?.headers) {
      for (const [k, v] of Object.entries(init.headers as Record<string, string>)) {
        headers[k.toLowerCase()] = v;
      }
    }
    state.captured = { headers, body };
    return new Response(JSON.stringify(responseBody), { status });
  };
  return {
    get captured() { return state.captured; },
    restore: () => { globalThis.fetch = original; },
  };
}

/** Build a minimal valid Anthropic messages API response. */
function anthropicOk(text: string) {
  return { content: [{ type: "text", text }] };
}

// ── getClaudeModel ────────────────────────────────────────────────────────────

Deno.test("getClaudeModel: returns CLAUDE_MODEL env var when set", () => {
  const original = Deno.env.get("CLAUDE_MODEL");
  Deno.env.set("CLAUDE_MODEL", "claude-test-model");
  assertEquals(getClaudeModel(), "claude-test-model");
  if (original === undefined) {
    Deno.env.delete("CLAUDE_MODEL");
  } else {
    Deno.env.set("CLAUDE_MODEL", original);
  }
});

Deno.test("getClaudeModel: returns default model when CLAUDE_MODEL not set", () => {
  const original = Deno.env.get("CLAUDE_MODEL");
  Deno.env.delete("CLAUDE_MODEL");
  assertStringIncludes(getClaudeModel(), "claude-");
  if (original !== undefined) Deno.env.set("CLAUDE_MODEL", original);
});

// ── callClaudeJsonText: missing API key ───────────────────────────────────────

Deno.test("callClaudeJsonText: returns anthropic_not_configured when key missing", async () => {
  const original = Deno.env.get("ANTHROPIC_API_KEY");
  Deno.env.delete("ANTHROPIC_API_KEY");

  const result = await callClaudeJsonText({ system: "sys", user: "usr", maxTokens: 100 });
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "anthropic_not_configured");

  if (original !== undefined) Deno.env.set("ANTHROPIC_API_KEY", original);
});

// ── callClaudeJsonText: request shape ─────────────────────────────────────────

Deno.test("callClaudeJsonText: sends prompt-caching beta header", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const mock = mockFetch(anthropicOk('{"ok":true}'));

  await callClaudeJsonText({ system: "my system prompt", user: "my user turn", maxTokens: 256 });

  const captured = mock.captured!;
  assertEquals(captured.headers["anthropic-beta"], "prompt-caching-2024-07-31");
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
});

Deno.test("callClaudeJsonText: wraps system string in structured cache_control block", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const mock = mockFetch(anthropicOk('{"result":"ok"}'));

  await callClaudeJsonText({ system: "static system prompt", user: "user turn", maxTokens: 256 });

  const captured = mock.captured!;
  const system = captured.body.system as Array<Record<string, unknown>>;
  assertEquals(Array.isArray(system), true);
  assertEquals(system.length, 1);
  assertEquals(system[0].type, "text");
  assertEquals(system[0].text, "static system prompt");
  assertEquals((system[0].cache_control as Record<string, string>).type, "ephemeral");
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
});

Deno.test("callClaudeJsonText: passes max_tokens, model, and user message correctly", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  Deno.env.set("CLAUDE_MODEL", "claude-test-4");
  const mock = mockFetch(anthropicOk("hello"));

  await callClaudeJsonText({ system: "sys", user: "tell me something", maxTokens: 512 });

  const captured = mock.captured!;
  assertEquals(captured.body.model, "claude-test-4");
  assertEquals(captured.body.max_tokens, 512);
  const messages = captured.body.messages as Array<{ role: string; content: string }>;
  assertEquals(messages[0].role, "user");
  assertEquals(messages[0].content, "tell me something");
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
  Deno.env.delete("CLAUDE_MODEL");
});

Deno.test("callClaudeJsonText: omits temperature when not provided", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const mock = mockFetch(anthropicOk("hi"));

  await callClaudeJsonText({ system: "s", user: "u", maxTokens: 100 });

  assertEquals("temperature" in mock.captured!.body, false);
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
});

Deno.test("callClaudeJsonText: includes temperature when provided", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const mock = mockFetch(anthropicOk("hi"));

  await callClaudeJsonText({ system: "s", user: "u", maxTokens: 100, temperature: 0.7 });

  assertEquals(mock.captured!.body.temperature, 0.7);
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
});

// ── callClaudeJsonText: response handling ─────────────────────────────────────

Deno.test("callClaudeJsonText: returns ok text on success", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const mock = mockFetch(anthropicOk('{"value":42}'));

  const result = await callClaudeJsonText({ system: "s", user: "u", maxTokens: 100 });

  assertEquals(result.ok, true);
  if (result.ok) assertEquals(result.text, '{"value":42}');
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
});

Deno.test("callClaudeJsonText: returns anthropic_http_error on non-200", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const mock = mockFetch({ error: { message: "overloaded" } }, 529);

  const result = await callClaudeJsonText({ system: "s", user: "u", maxTokens: 100 });

  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "anthropic_http_error");
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
});

Deno.test("callClaudeJsonText: returns anthropic_empty_response on empty content array", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const mock = mockFetch({ content: [] });

  const result = await callClaudeJsonText({ system: "s", user: "u", maxTokens: 100 });

  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "anthropic_empty_response");
  mock.restore();
  Deno.env.delete("ANTHROPIC_API_KEY");
});

Deno.test("callClaudeJsonText: returns anthropic_http_error on invalid JSON body", async () => {
  Deno.env.set("ANTHROPIC_API_KEY", "test-key");
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response("not json at all", { status: 200 });

  const result = await callClaudeJsonText({ system: "s", user: "u", maxTokens: 100 });

  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.error, "anthropic_http_error");
  globalThis.fetch = original;
  Deno.env.delete("ANTHROPIC_API_KEY");
});

// ── parseJsonObject ───────────────────────────────────────────────────────────

Deno.test("parseJsonObject: parses bare JSON object", () => {
  const r = parseJsonObject('{"a":1}');
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value, { a: 1 });
});

Deno.test("parseJsonObject: strips ```json fences", () => {
  const r = parseJsonObject("```json\n{\"x\":\"y\"}\n```");
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value, { x: "y" });
});

Deno.test("parseJsonObject: returns ok:false for plain array", () => {
  const r = parseJsonObject("[1,2,3]");
  assertEquals(r.ok, false);
});

Deno.test("parseJsonObject: returns ok:false for invalid JSON", () => {
  const r = parseJsonObject("not json");
  assertEquals(r.ok, false);
});

// ── parseJsonArray ────────────────────────────────────────────────────────────

Deno.test("parseJsonArray: parses bare JSON array", () => {
  const r = parseJsonArray('[1,"two",3]');
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value, [1, "two", 3]);
});

Deno.test("parseJsonArray: strips ``` fences", () => {
  const r = parseJsonArray("```\n[\"a\",\"b\"]\n```");
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.value, ["a", "b"]);
});

Deno.test("parseJsonArray: returns ok:false for plain object", () => {
  const r = parseJsonArray('{"a":1}');
  assertEquals(r.ok, false);
});
