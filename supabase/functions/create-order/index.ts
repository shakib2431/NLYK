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
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
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

    try {
      const url = new URL(href);

      if (url.protocol !== "https:") {
        throw new Error(
          `Email URL must use HTTPS: ${href}`,
        );
      }
    } catch {
      throw new Error(
        `Invalid email URL: ${href}`,
      );
    }
  }
}

async function sendEmail(
  to: string,
  subject: string,
  html: string,
) {
  if (!isValidEmail(to)) {
    throw new Error("invalid_email");
  }

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

function generateOrderId(): string {
  return `NLO-${Math.floor(
    1000 + Math.random() * 9000,
  )}`;
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(
        {
          detail: "method_not_allowed",
        },
        405,
      );
    }

    /*
     * Server-to-server only.
     * Never expose the Supabase secret key
     * or Resend API key to the frontend.
     */

    const apiKey =
      req.headers.get("apikey") || "";

    if (
      !supabaseSecret ||
      apiKey !== supabaseSecret
    ) {
      return json(
        {
          detail: "unauthorized",
        },
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
        ? body.name.trim()
        : "";

    const items =
      Array.isArray(body.items)
        ? body.items
        : [];

    const subtotal =
      Number.isFinite(Number(body.subtotal))
        ? Number(body.subtotal)
        : 0;

    const shipping =
      Number.isFinite(Number(body.shipping))
        ? Number(body.shipping)
        : 0;

    const total =
      Number.isFinite(Number(body.total))
        ? Number(body.total)
        : 0;

    if (!isValidEmail(email)) {
      return json(
        {
          detail: "invalid_email",
        },
        400,
      );
    }

    if (items.length === 0) {
      return json(
        {
          detail: "empty_order",
        },
        400,
      );
    }

    /*
     * Generate a unique Nalayak order ID.
     */

    let orderId = "";

    for (let attempt = 0; attempt < 10; attempt++) {
      const candidate =
        generateOrderId();

      const { data, error } =
        await supabase
          .from("orders")
          .select("id")
          .eq("order_id", candidate)
          .maybeSingle();

      if (error) {
        console.error(
          "Order lookup failed:",
          error,
        );

        return json(
          {
            detail:
              "Failed to check order status",
          },
          502,
        );
      }

      if (!data) {
        orderId = candidate;
        break;
      }
    }

    if (!orderId) {
      return json(
        {
          detail:
            "Failed to generate order ID",
        },
        500,
      );
    }

    /*
     * Store the order.
     */

    const order = {
      order_id: orderId,
      email,
      name,
      items,
      subtotal,
      shipping,
      total,
      status: "placed",
      created_at:
        new Date().toISOString(),
    };

    const { error: insertError } =
      await supabase
        .from("orders")
        .insert(order);

    if (insertError) {
      console.error(
        "Order insert failed:",
        insertError,
      );

      return json(
        {
          detail:
            "Failed to create order",
        },
        502,
      );
    }

    /*
     * Build order confirmation email.
     */

    const rows = items
      .map((item: any) => {
        const itemName =
          escapeHtml(
            String(item?.name ?? ""),
          );

        const size =
          escapeHtml(
            String(item?.size ?? ""),
          );

        const qty =
          Math.max(
            1,
            Number(item?.qty ?? 1),
          );

        const price =
          Number(item?.price ?? 0);

        const lineTotal =
          price * qty;

        return (
          `<tr>` +
          `<td style="padding:8px 0;font-size:13px;color:#333">` +
          `${itemName} ` +
          `<span style="color:#8C8C8C">` +
          `· ${size} × ${qty}` +
          `</span>` +
          `</td>` +
          `<td style="padding:8px 0;font-size:13px;color:#333;text-align:right">` +
          `₹${lineTotal.toLocaleString("en-IN")}` +
          `</td>` +
          `</tr>`
        );
      })
      .join("");

    const firstName =
      escapeHtml(
        name.split(/\s+/)[0] ||
          "NALAYAK",
      );

    const shippingText =
      shipping === 0
        ? "FREE"
        : `₹${shipping.toLocaleString("en-IN")}`;

    const trackingUrl =
      `${SITE_URL}/track/${encodeURIComponent(orderId)}`;

    const subject =
      `Order ${orderId} — confirmed.`;

    const html =
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
      '<tr>' +
      '<td style="padding:32px 24px;font-family:Arial,sans-serif;background:#0A0A0A">' +
      '<p style="color:#F7F7F5;font-size:28px;font-weight:800;letter-spacing:-1px;margin:0">NALAYAK</p>' +
      '</td>' +
      '</tr>' +

      '<tr>' +
      '<td style="padding:40px 24px;font-family:Arial,sans-serif">' +

      '<p style="font-size:11px;letter-spacing:3px;color:#8C8C8C;margin:0 0 12px">' +
      'ORDER CONFIRMED' +
      '</p>' +

      `<h1 style="font-size:32px;font-weight:800;letter-spacing:-1px;margin:0 0 16px">` +
      `GOOD CHOICE, ${firstName.toUpperCase()}.` +
      `</h1>` +

      `<p style="font-size:14px;color:#444;line-height:1.6;margin:0 0 24px">` +
      `Order <strong>${escapeHtml(orderId)}</strong> is in. ` +
      `It ships from Kolkata within 48 hours.` +
      `</p>` +

      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #E5E5E5">` +
      rows +

      `<tr>` +
      `<td style="padding:12px 0;font-size:13px;color:#8C8C8C;border-top:1px solid #E5E5E5">` +
      `Shipping` +
      `</td>` +

      `<td style="padding:12px 0;font-size:13px;text-align:right;border-top:1px solid #E5E5E5">` +
      shippingText +
      `</td>` +
      `</tr>` +

      `<tr>` +
      `<td style="padding:4px 0 12px;font-size:15px;font-weight:700">` +
      `Total` +
      `</td>` +

      `<td style="padding:4px 0 12px;font-size:15px;font-weight:700;text-align:right">` +
      `₹${total.toLocaleString("en-IN")}` +
      `</td>` +
      `</tr>` +

      `</table>` +

      `<a href="${trackingUrl}" style="display:inline-block;background:#0A0A0A;color:#F7F7F5;font-size:11px;letter-spacing:3px;text-decoration:none;padding:14px 28px;margin-top:8px">` +
      `TRACK YOUR ORDER` +
      `</a>` +

      '<p style="font-size:11px;color:#8C8C8C;margin:32px 0 0">' +
      'Sent by NALAYAK. We never ask for your password or card details by email.' +
      '</p>' +

      '</td>' +
      '</tr>' +
      '</table>';

    let emailId: string | null = null;

    try {
      emailId = await sendEmail(
        email,
        subject,
        html,
      );
    } catch (emailError) {
      /*
       * The order is already stored.
       * Do not delete it just because email failed.
       */
      console.error(
        "Order email failed:",
        emailError,
      );
    }

    /*
     * Keep the old frontend-compatible
     * response shape.
     */

    return json({
      orderId,
      emailed: Boolean(emailId),
      email_id: emailId,
    });
  } catch (error) {
    console.error(
      "create-order failed:",
      error,
    );

    return json(
      {
        detail:
          "Failed to create order",
      },
      502,
    );
  }
});