/**
 * Unit tests for the shared JWT auth helpers.
 *
 * These tests cover the auth rejection patterns used by all browser-callable
 * Edge Functions. They mock the Supabase auth client so no network calls are made.
 *
 * Run: deno test supabase/functions/_shared/auth.test.ts
 */
import { assertEquals } from "jsr:@std/assert";
import {
  extractAndValidateJwt,
  extractBearer,
  validateJwt,
  type SupabaseAuthClient,
} from "./auth.ts";

// ── Mock helpers ──────────────────────────────────────────────────────────────

function mockClient(
  user: { id: string } | null,
  error: { message: string } | null = null,
): SupabaseAuthClient {
  return {
    auth: {
      getUser: async (_jwt: string) => ({ data: { user }, error }),
    },
  };
}

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set("Authorization", authHeader);
  return new Request("https://example.supabase.co/functions/v1/test", {
    method: "POST",
    headers,
  });
}

// ── extractBearer ─────────────────────────────────────────────────────────────

Deno.test("extractBearer — returns null when Authorization header is missing", () => {
  const req = makeRequest();
  assertEquals(extractBearer(req), null);
});

Deno.test("extractBearer — returns null when header is not Bearer scheme", () => {
  assertEquals(extractBearer(makeRequest("Basic dXNlcjpwYXNz")), null);
  assertEquals(extractBearer(makeRequest("Token abc123")), null);
  assertEquals(extractBearer(makeRequest("bearer token")), null); // case-sensitive
});

Deno.test("extractBearer — returns null when Bearer prefix has no token", () => {
  // The Fetch API Headers implementation trims trailing whitespace, so "Bearer "
  // (7 chars) is stored as "Bearer" which no longer matches the "Bearer " prefix.
  // The result is null, meaning the request is treated as missing auth.
  assertEquals(extractBearer(makeRequest("Bearer ")), null);
});

Deno.test("extractBearer — returns the token string for a well-formed header", () => {
  assertEquals(extractBearer(makeRequest("Bearer my.jwt.token")), "my.jwt.token");
  assertEquals(extractBearer(makeRequest("Bearer eyJhbGc.payload.sig")), "eyJhbGc.payload.sig");
});

// ── validateJwt ───────────────────────────────────────────────────────────────

Deno.test("validateJwt — returns userId when client returns a user", async () => {
  const client = mockClient({ id: "user-uuid-123" });
  const result = await validateJwt("valid.jwt.token", client);
  assertEquals(result, { ok: true, userId: "user-uuid-123", jwt: "valid.jwt.token" });
});

Deno.test("validateJwt — returns 401 when client returns null user", async () => {
  const client = mockClient(null);
  const result = await validateJwt("some.jwt.token", client);
  assertEquals(result, {
    ok: false,
    status: 401,
    error: "unauthorized",
    detail: "invalid_or_expired_session",
  });
});

Deno.test("validateJwt — returns 401 when client returns an error", async () => {
  const client = mockClient(null, { message: "JWT expired" });
  const result = await validateJwt("expired.jwt.token", client);
  assertEquals(result, {
    ok: false,
    status: 401,
    error: "unauthorized",
    detail: "invalid_or_expired_session",
  });
});

Deno.test("validateJwt — returns 401 when client returns both error and user (error takes precedence)", async () => {
  const client = mockClient({ id: "u1" }, { message: "Something wrong" });
  const result = await validateJwt("jwt", client);
  assertEquals(result.ok, false);
  if (!result.ok) assertEquals(result.status, 401);
});

// ── extractAndValidateJwt ─────────────────────────────────────────────────────

Deno.test("extractAndValidateJwt — 401 when Authorization header is absent", async () => {
  const client = mockClient({ id: "u1" }); // client should never be called
  let called = false;
  const spyClient: SupabaseAuthClient = {
    auth: {
      getUser: async (_jwt) => {
        called = true;
        return { data: { user: { id: "u1" } }, error: null };
      },
    },
  };
  const result = await extractAndValidateJwt(makeRequest(), spyClient);
  assertEquals(result, {
    ok: false,
    status: 401,
    error: "unauthorized",
    detail: "missing_bearer",
  });
  assertEquals(called, false, "auth client must not be called when header is missing");
});

Deno.test("extractAndValidateJwt — 401 when Authorization scheme is not Bearer", async () => {
  const client = mockClient({ id: "u1" });
  const result = await extractAndValidateJwt(makeRequest("Basic dXNlcjpwYXNz"), client);
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.status, 401);
    assertEquals(result.detail, "missing_bearer");
  }
});

Deno.test("extractAndValidateJwt — 401 when token is present but JWT is invalid", async () => {
  const client = mockClient(null, { message: "Invalid JWT" });
  const result = await extractAndValidateJwt(makeRequest("Bearer bad.token.here"), client);
  assertEquals(result, {
    ok: false,
    status: 401,
    error: "unauthorized",
    detail: "invalid_or_expired_session",
  });
});

Deno.test("extractAndValidateJwt — returns userId for a valid Bearer JWT", async () => {
  const client = mockClient({ id: "creator-abc-456" });
  const result = await extractAndValidateJwt(
    makeRequest("Bearer eyJhbGc.real.payload"),
    client,
  );
  assertEquals(result, {
    ok: true,
    userId: "creator-abc-456",
    jwt: "eyJhbGc.real.payload",
  });
});

// ── Integration: replicates the pattern used in browser-callable handlers ─────
//
// This test shows that the pattern used by delete-account, manuscript-upload-parse,
// reconcile-subscription-status, ai-split-proposal, approve-alignment, etc. is
// correctly handled by extractAndValidateJwt. Any handler using this utility
// inherits these guarantees.

Deno.test("handler pattern — missing auth → should return 401 without reaching business logic", async () => {
  let businessLogicReached = false;
  const client = mockClient({ id: "u1" });

  async function simulatedHandler(req: Request): Promise<Response> {
    const auth = await extractAndValidateJwt(req, client);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error, detail: auth.detail }), {
        status: auth.status,
        headers: { "Content-Type": "application/json" },
      });
    }
    businessLogicReached = true;
    return new Response(JSON.stringify({ ok: true, userId: auth.userId }), { status: 200 });
  }

  const res = await simulatedHandler(makeRequest());
  assertEquals(res.status, 401);
  assertEquals(businessLogicReached, false);
});

Deno.test("handler pattern — valid auth → business logic proceeds with userId", async () => {
  const client = mockClient({ id: "user-xyz" });

  async function simulatedHandler(req: Request): Promise<Response> {
    const auth = await extractAndValidateJwt(req, client);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), { status: auth.status });
    }
    return new Response(JSON.stringify({ ok: true, userId: auth.userId }), { status: 200 });
  }

  const res = await simulatedHandler(makeRequest("Bearer valid.token.here"));
  assertEquals(res.status, 200);
  const body = await res.json() as { ok: boolean; userId: string };
  assertEquals(body.ok, true);
  assertEquals(body.userId, "user-xyz");
});
