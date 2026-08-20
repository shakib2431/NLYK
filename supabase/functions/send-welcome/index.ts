import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@4.8.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const secretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS") || "{}",
);

const supabaseSecret =
  secretKeys["default"] ||
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(
  supabaseUrl,
  supabaseSecret!,
);

const resend = new Resend(
  Deno.env.get("RESEND_API_KEY"),
);

const FROM_EMAIL =
  Deno.env.get("EMAIL_FROM") ||
  "NALAYAK <onboarding@resend.dev>";

const SITE_URL = (
  Deno.env.get("SITE_URL") ||
  "https://nalayak.store"
).replace(/\/+$/, "");

function json(data: unknown, status = 200) {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function isHttpsUrl(value: string): boolean {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function assertSafeEmail(
  subject: string,
  html: string,
) {
  const body =
    `${subject}\n${html}`.toLowerCase();

  const forbidden = [
    "reply with your password",
    "send your password",
    "cvv",
    "send us your password",
    "enter your password below",
    "confirm your card number",
    "your full card number",
    "seed phrase",
    "recovery phrase",
    "verify your card",
    "social security number",
    "confirm your bank details",
  ];

  for (const phrase of forbidden) {
    if (body.includes(phrase)) {
      throw new Error(
        "Email asks the recipient for credentials",
      );
    }
  }

  if (
    /<(form|input|textarea|select)\b/i.test(html)
  ) {
    throw new Error(
      "Email forms and input fields are not allowed",
    );
  }

  const hrefs = [
    ...html.matchAll(
      /\b(?:href|src)=["']([^"']+)["']/gi,
    ),
  ].map((m) => m[1]);

  for (const href of hrefs) {
    if (
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("cid:") ||
      href.startsWith("#")
    ) {
      continue;
    }

    if (!isHttpsUrl(href)) {
      throw new Error(
        `Email URL must use HTTPS: ${href}`,
      );
    }
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
) {
  assertSafeEmail(subject, html);

  const { data, error } =
    await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    });

  if (error) {
    console.error(
      "Resend error:",
      error,
    );

    throw new Error(
      "Failed to send email",
    );
  }

  return data?.id ?? null;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(
        { detail: "method_not_allowed" },
        405,
      );
    }

    const apiKey =
      req.headers.get("apikey") || "";

    if (
      !supabaseSecret ||
      apiKey !== supabaseSecret
    ) {
      return json(
        { detail: "unauthorized" },
        401,
      );
    }

    const body = await req.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name
        : "";

    const requestedKind =
      typeof body.kind === "string"
        ? body.kind
        : "member";

    if (!isValidEmail(email)) {
      return json(
        { detail: "invalid_email" },
        400,
      );
    }

    const kind =
      requestedKind === "club"
        ? "club"
        : "member";

    const existing =
      await supabase
        .from("email_log")
        .select("id")
        .eq("email", email)
        .eq(
          "kind",
          `welcome-${kind}`,
        )
        .is("ref", null)
        .maybeSingle();

    if (existing.error) {
      console.error(
        "email_log lookup failed:",
        existing.error,
      );

      return json(
        {
          detail:
            "Failed to check email status",
        },
        502,
      );
    }

    if (existing.data) {
      return json({
        status: "already_sent",
      });
    }

    const firstName =
      escapeHtml(
        name.trim().split(/\s+/)[0] ||
          "there",
      );

    let subject: string;
    let headline: string;
    let bodyText: string;
    let ctaHref: string;
    let ctaText: string;

    if (kind === "club") {
      subject =
        "Welcome to Nalayak Club.";

      headline =
        "ACCESS IS THE REWARD.";

      bodyText =
        "Early drops, private pieces, member-only releases. You now get there before everyone else.";

      ctaHref =
        `${SITE_URL}/club/drops`;

      ctaText =
        "VIEW CLUB DROPS";
    } else {
      subject =
        "You're in the wrong crowd.";

      headline =
        "START WITH BELONGING.";

      bodyText =
        "Membership is free. The good stuff comes with it — first looks, restock access and a status you earn, not buy.";

      ctaHref =
        `${SITE_URL}/new-arrivals`;

      ctaText =
        "SHOP NEW ARRIVALS";
    }

    const html =
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      '<tr><td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">' +
      '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>' +
      "</td></tr>" +
      '<tr><td style="padding:40px 24px;font-family:Arial,sans-serif">' +
      `<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">NALAYAK ${kind === "club" ? "CLUB" : "MEMBERS"}</p>` +
      `<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">${headline}</h1>` +
      `<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 28px">Hi ${firstName}. ${bodyText}</p>` +
      `<a href="${ctaHref}" style="display:inline-block;background:#0A0A0A;color:#F7F7F5;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px">${ctaText}</a>` +
      '<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">Sent by NALAYAK.</p>' +
      "</td></tr></table>";

    const resendId =
      await sendEmail(
        email,
        subject,
        html,
      );

    const log =
      await supabase
        .from("email_log")
        .insert({
          email,
          kind: `welcome-${kind}`,
          ref: null,
          resend_id: resendId,
        })
        .select("id")
        .single();

    if (log.error) {
      console.error(
        "email_log insert failed:",
        log.error,
      );
    }

    return json({
      status: "sent",
      email_id: resendId,
    });
  } catch (error) {
    console.error(
      "send-welcome failed:",
      error,
    );

    return json(
      {
        detail:
          "Failed to send welcome email",
      },
      502,
    );
  }
});