import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildMpSignatureManifest,
  computeMpSignatureHmacHex,
  verifyMercadoPagoWebhookSignature,
} from "../../../supabase/functions/_shared/payment/mercadopago/signature.ts";

describe("Mercado Pago webhook signature helpers", () => {
  it("builds manifest in id / request-id / ts order", () => {
    expect(buildMpSignatureManifest("ABC", "rid", "9")).toBe("id:abc;request-id:rid;ts:9;");
    expect(buildMpSignatureManifest(null, null, "9")).toBe("ts:9;");
  });

  it("verifies HMAC against Mercado Pago template", () => {
    const secret = "test_secret";
    const ts = "1704908010";
    const dataId = "999";
    const requestId = "req-1";
    const manifest = buildMpSignatureManifest(dataId, requestId, ts);
    const v1 = createHmac("sha256", secret).update(manifest).digest("hex");
    const xSignature = `ts=${ts},v1=${v1}`;
    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature,
        xRequestId: requestId,
        dataId,
        secret,
      }),
    ).toBe(true);
    expect(computeMpSignatureHmacHex(secret, manifest)).toBe(v1);
  });

  it("rejects tampered signature", () => {
    const secret = "a";
    const ts = "1";
    const xSignature = `ts=${ts},v1=deadbeef`;
    expect(
      verifyMercadoPagoWebhookSignature({
        xSignature,
        xRequestId: "y",
        dataId: "x",
        secret,
      }),
    ).toBe(false);
  });
});
