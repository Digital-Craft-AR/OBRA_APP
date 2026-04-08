import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type HookPayload = {
  email_data?: {
    action_type?: string;
    token_new?: string;
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type?: string;
  };
  user?: {
    email?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  };
};

const APP_URL = Deno.env.get("OBRA_APP_URL")?.replace(/\/$/, "");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL");

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function resolveLocale(payload: HookPayload): "es" | "pt-BR" {
  const candidate =
    payload.user?.user_metadata?.ui_locale ??
    payload.user?.app_metadata?.ui_locale ??
    payload.user?.user_metadata?.locale;
  return candidate === "pt-BR" ? "pt-BR" : "es";
}

function actionType(payload: HookPayload): string {
  return (
    payload.email_data?.email_action_type ??
    payload.email_data?.action_type ??
    "confirmation"
  );
}

function actionUrl(payload: HookPayload): string | null {
  if (payload.email_data?.redirect_to) return payload.email_data.redirect_to;
  if (!APP_URL) return null;

  const hash = payload.email_data?.token_hash;
  const token = payload.email_data?.token_new ?? payload.email_data?.token;
  if (!hash && !token) return null;

  const params = new URLSearchParams();
  if (hash) params.set("token_hash", hash);
  if (token) params.set("token", token);
  const type = actionType(payload);
  params.set("type", type);
  return `${APP_URL}/auth/callback?${params.toString()}`;
}

function localizedContent(locale: "es" | "pt-BR", action: string) {
  if (locale === "pt-BR") {
    if (action === "recovery") {
      return {
        subject: "Redefina sua senha da Obra",
        title: "Redefina sua senha",
        lead: "Recebemos um pedido para redefinir sua senha da Obra.",
        cta: "Redefinir senha",
        outro: "Se você não fez este pedido, ignore este e-mail.",
      };
    }
    if (action === "email_change") {
      return {
        subject: "Confirme seu novo e-mail na Obra",
        title: "Confirme seu novo e-mail",
        lead: "Você solicitou a troca do e-mail da sua conta Obra.",
        cta: "Confirmar novo e-mail",
        outro: "Se você não pediu essa alteração, entre em contato com o suporte.",
      };
    }
    return {
      subject: "Confirme seu e-mail na Obra",
      title: "Confirme seu e-mail",
      lead: "Obrigado por criar sua conta na Obra. Confirme seu e-mail para ativar seu acesso.",
      cta: "Confirmar e-mail",
      outro: "Se você não criou esta conta, ignore este e-mail.",
    };
  }

  if (action === "recovery") {
    return {
      subject: "Restablece tu clave de Obra",
      title: "Restablece tu clave",
      lead: "Recibimos una solicitud para cambiar tu clave de Obra.",
      cta: "Restablecer clave",
      outro: "Si no hiciste este pedido, puedes ignorar este correo.",
    };
  }
  if (action === "email_change") {
    return {
      subject: "Confirma tu nuevo correo en Obra",
      title: "Confirma tu nuevo correo",
      lead: "Pediste cambiar el correo de tu cuenta de Obra.",
      cta: "Confirmar nuevo correo",
      outro: "Si no pediste este cambio, contacta soporte.",
    };
  }
  return {
    subject: "Confirma tu correo en Obra",
    title: "Confirma tu correo",
    lead: "Gracias por registrarte en Obra. Confirma tu correo para activar tu cuenta.",
    cta: "Confirmar correo",
    outro: "Si no creaste esta cuenta, puedes ignorar este correo.",
  };
}

function renderEmailHtml({
  title,
  lead,
  cta,
  outro,
  href,
}: {
  title: string;
  lead: string;
  cta: string;
  outro: string;
  href: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#F4F8FC; font-family:'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#0F2438;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F8FC; padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px; background:#FFFFFF; border:1px solid #E8F0F7; border-radius:16px; box-shadow:0 4px 16px rgba(15, 36, 56, 0.08);">
            <tr>
              <td style="padding:40px;">
                <img src="${APP_URL ?? ""}/assets/e19e88c23bdca35264776a01dd4d9c985aa84fa4.png" alt="Obra" width="120" style="display:block; width:120px; max-width:100%; height:auto; margin:0 0 24px 0;" />
                <h1 style="margin:0 0 10px 0; font-family:'Fraunces', Georgia, serif; font-size:20px; line-height:1.3; font-weight:700; color:#0F2438;">${title}</h1>
                <p style="margin:0 0 18px 0; font-size:14px; line-height:1.6; color:#5A7A94;">${lead}</p>
                <p style="margin:0 0 18px 0;">
                  <a href="${href}" style="display:inline-block; background:#C8E62B; color:#0F2438; text-decoration:none; font-size:14px; font-weight:600; line-height:1; padding:12px 20px; border-radius:9999px;">${cta}</a>
                </p>
                <p style="margin:0; font-size:14px; line-height:1.6; color:#5A7A94;">${outro}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return json(
      {
        error: "server_misconfigured",
        detail: "Missing RESEND_API_KEY or RESEND_FROM_EMAIL",
      },
      500,
    );
  }

  const payload = (await req.json()) as HookPayload;
  const to = payload.user?.email;
  if (!to) return json({ error: "invalid_payload", detail: "Missing user.email" }, 400);

  const locale = resolveLocale(payload);
  const action = actionType(payload);
  const href = actionUrl(payload);
  if (!href) return json({ error: "invalid_payload", detail: "Missing action link" }, 400);

  const content = localizedContent(locale, action);
  const html = renderEmailHtml({
    title: content.title,
    lead: content.lead,
    cta: content.cta,
    outro: content.outro,
    href,
  });

  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: content.subject,
      html,
    }),
  });

  if (!resendRes.ok) {
    const detail = await resendRes.text();
    console.error("send_auth_email_failed", resendRes.status, detail);
    return json({ error: "provider_error", detail }, 502);
  }

  return json({ ok: true });
});
