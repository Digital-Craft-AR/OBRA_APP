/**
 * Mercado Pago webhook x-signature validation (Your integrations secret).
 * @see https://www.mercadopago.com.ar/developers/en/docs/your-integrations/notifications/webhooks
 */
import { createHmac } from "node:crypto";

export function parseMpSignatureHeader(
  xSignature: string | null,
): { ts: string; v1: string } | null {
  if (!xSignature) return null;
  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    const value = part.slice(eq + 1).trim();
    if (key === "ts") ts = value;
    if (key === "v1") v1 = value;
  }
  if (!ts || !v1) return null;
  return { ts, v1 };
}

/** Build manifest per MP docs: id (lowercase), request-id, ts — omit missing segments. */
export function buildMpSignatureManifest(
  dataId: string | null | undefined,
  requestId: string | null | undefined,
  ts: string,
): string {
  const parts: string[] = [];
  if (dataId != null && dataId !== "") {
    parts.push(`id:${String(dataId).toLowerCase()};`);
  }
  if (requestId != null && requestId !== "") {
    parts.push(`request-id:${requestId};`);
  }
  parts.push(`ts:${ts};`);
  return parts.join("");
}

export function computeMpSignatureHmacHex(secret: string, manifest: string): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

export function verifyMercadoPagoWebhookSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  /** Payment / resource id from query or body */
  dataId: string | null;
  secret: string;
}): boolean {
  const parsed = parseMpSignatureHeader(opts.xSignature);
  if (!parsed) return false;
  const manifest = buildMpSignatureManifest(opts.dataId, opts.xRequestId, parsed.ts);
  const expected = computeMpSignatureHmacHex(opts.secret, manifest);
  return timingSafeEqualHex(expected.toLowerCase(), parsed.v1.toLowerCase());
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}
