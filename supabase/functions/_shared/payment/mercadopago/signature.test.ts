/**
 * Unit tests for Mercado Pago webhook signature verification.
 *
 * The mercadopago-webhook function uses verify_jwt = false intentionally — it's an
 * external webhook that Mercado Pago calls without a user JWT. Instead, it validates
 * the x-signature HMAC header. These tests verify that the HMAC-based auth works
 * correctly and that missing/invalid signatures are rejected.
 *
 * Run: deno test supabase/functions/_shared/payment/mercadopago/signature.test.ts
 */
import { assertEquals } from "jsr:@std/assert";
import { createHmac } from "node:crypto";
import {
  buildMpSignatureManifest,
  computeMpSignatureHmacHex,
  parseMpSignatureHeader,
  verifyMercadoPagoWebhookSignature,
} from "./signature.ts";

// ── parseMpSignatureHeader ────────────────────────────────────────────────────

Deno.test("parseMpSignatureHeader — returns null for null input", () => {
  assertEquals(parseMpSignatureHeader(null), null);
});

Deno.test("parseMpSignatureHeader — returns null for empty string", () => {
  assertEquals(parseMpSignatureHeader(""), null);
});

Deno.test("parseMpSignatureHeader — returns null when ts or v1 is missing", () => {
  assertEquals(parseMpSignatureHeader("ts=1234567890"), null);
  assertEquals(parseMpSignatureHeader("v1=abc123"), null);
});

Deno.test("parseMpSignatureHeader — parses well-formed x-signature header", () => {
  const result = parseMpSignatureHeader("ts=1234567890,v1=abc123def456");
  assertEquals(result, { ts: "1234567890", v1: "abc123def456" });
});

Deno.test("parseMpSignatureHeader — trims whitespace around key=value pairs", () => {
  const result = parseMpSignatureHeader(" ts = 111 , v1 = aaa ");
  assertEquals(result, { ts: "111", v1: "aaa" });
});

// ── buildMpSignatureManifest ──────────────────────────────────────────────────

Deno.test("buildMpSignatureManifest — includes all three segments when all present", () => {
  const manifest = buildMpSignatureManifest("456", "req-999", "1234567890");
  assertEquals(manifest, "id:456;request-id:req-999;ts:1234567890;");
});

Deno.test("buildMpSignatureManifest — omits id segment when dataId is null", () => {
  const manifest = buildMpSignatureManifest(null, "req-999", "1234567890");
  assertEquals(manifest, "request-id:req-999;ts:1234567890;");
});

Deno.test("buildMpSignatureManifest — omits request-id segment when requestId is null", () => {
  const manifest = buildMpSignatureManifest("456", null, "1234567890");
  assertEquals(manifest, "id:456;ts:1234567890;");
});

Deno.test("buildMpSignatureManifest — lowercases the dataId", () => {
  const manifest = buildMpSignatureManifest("ABC-123", "req", "9999");
  assertEquals(manifest, "id:abc-123;request-id:req;ts:9999;");
});

// ── computeMpSignatureHmacHex ─────────────────────────────────────────────────

Deno.test("computeMpSignatureHmacHex — matches node:crypto reference implementation", () => {
  const secret = "test-secret";
  const manifest = "id:123;request-id:req-1;ts:1700000000;";
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  assertEquals(computeMpSignatureHmacHex(secret, manifest), expected);
});

// ── verifyMercadoPagoWebhookSignature — rejection paths ──────────────────────

Deno.test("verifyMercadoPagoWebhookSignature — rejects when x-signature is null", () => {
  assertEquals(
    verifyMercadoPagoWebhookSignature({
      xSignature: null,
      xRequestId: "req-1",
      dataId: "123",
      secret: "any-secret",
    }),
    false,
  );
});

Deno.test("verifyMercadoPagoWebhookSignature — rejects when x-signature has wrong format", () => {
  assertEquals(
    verifyMercadoPagoWebhookSignature({
      xSignature: "invalid-header",
      xRequestId: "req-1",
      dataId: "123",
      secret: "any-secret",
    }),
    false,
  );
});

Deno.test("verifyMercadoPagoWebhookSignature — rejects a tampered signature", () => {
  assertEquals(
    verifyMercadoPagoWebhookSignature({
      xSignature: "ts=1700000000,v1=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      xRequestId: "req-1",
      dataId: "123",
      secret: "real-secret",
    }),
    false,
  );
});

// ── verifyMercadoPagoWebhookSignature — acceptance path ──────────────────────

Deno.test("verifyMercadoPagoWebhookSignature — accepts a correctly signed webhook", () => {
  const secret = "test-webhook-secret";
  const dataId = "98765";
  const requestId = "request-abc";
  const ts = "1700000000";

  const manifest = buildMpSignatureManifest(dataId, requestId, ts);
  const v1 = computeMpSignatureHmacHex(secret, manifest);
  const xSignature = `ts=${ts},v1=${v1}`;

  assertEquals(
    verifyMercadoPagoWebhookSignature({
      xSignature,
      xRequestId: requestId,
      dataId,
      secret,
    }),
    true,
  );
});

Deno.test("verifyMercadoPagoWebhookSignature — accepts when dataId and requestId are uppercase (normalized to lowercase)", () => {
  const secret = "test-secret-2";
  const dataId = "ABC-456";
  const requestId = "req-XYZ";
  const ts = "1700001111";

  const manifest = buildMpSignatureManifest(dataId, requestId, ts);
  const v1 = computeMpSignatureHmacHex(secret, manifest);
  const xSignature = `ts=${ts},v1=${v1}`;

  assertEquals(
    verifyMercadoPagoWebhookSignature({
      xSignature,
      xRequestId: requestId,
      dataId,
      secret,
    }),
    true,
  );
});

Deno.test("verifyMercadoPagoWebhookSignature — rejects when dataId differs from signed value", () => {
  const secret = "secret";
  const ts = "1700000000";
  const realDataId = "real-id";
  const spoofedDataId = "spoofed-id";

  const manifest = buildMpSignatureManifest(realDataId, "req-1", ts);
  const v1 = computeMpSignatureHmacHex(secret, manifest);
  const xSignature = `ts=${ts},v1=${v1}`;

  assertEquals(
    verifyMercadoPagoWebhookSignature({
      xSignature,
      xRequestId: "req-1",
      dataId: spoofedDataId,
      secret,
    }),
    false,
  );
});
