import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

const ALLOWED_STATUSES = [
  "placed",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return json(
        { detail: "method_not_allowed" },
        405,
      );
    }

    /*
     * Server/admin only.
     * Never expose the Supabase secret key to the frontend.
     */
    const apiKey = req.headers.get("apikey") || "";

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

    const orderId =
      typeof body.order_id === "string"
        ? body.order_id.trim()
        : typeof body.orderId === "string"
          ? body.orderId.trim()
          : "";

    const status =
      typeof body.status === "string"
        ? body.status.trim().toLowerCase()
        : "";

    if (!orderId) {
      return json(
        { detail: "order_id_required" },
        400,
      );
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return json(
        {
          detail: "invalid_status",
          allowed_statuses: ALLOWED_STATUSES,
        },
        400,
      );
    }

    /*
     * First make sure the order exists.
     */
    const existing = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (existing.error) {
      console.error(
        "Order lookup failed:",
        existing.error,
      );

      return json(
        { detail: "Failed to fetch order" },
        502,
      );
    }

    if (!existing.data) {
      return json(
        { detail: "not_found" },
        404,
      );
    }

    /*
     * Build only the fields that should change.
     */
    const update: Record<string, unknown> = {
      status,
    };

    const now = new Date().toISOString();

    if (status === "shipped") {
      update.shipped_at =
        existing.data.shipped_at || now;
    }

    if (status === "delivered") {
      update.delivered_at =
        existing.data.delivered_at || now;

      if (!existing.data.shipped_at) {
        update.shipped_at = now;
      }
    }

    /*
     * If the request contains tracking information,
     * preserve/update it.
     */
    if (
      typeof body.tracking_url === "string"
    ) {
      update.tracking_url =
        body.tracking_url.trim();
    }

    if (
      typeof body.shiprocket_order_id === "string"
    ) {
      update.shiprocket_order_id =
        body.shiprocket_order_id.trim();
    }

    if (
      typeof body.shiprocket_shipment_id === "string"
    ) {
      update.shiprocket_shipment_id =
        body.shiprocket_shipment_id.trim();
    }

    if (
      typeof body.shiprocket_awb === "string"
    ) {
      update.shiprocket_awb =
        body.shiprocket_awb.trim();
    }

    if (
      typeof body.shiprocket_courier === "string"
    ) {
      update.shiprocket_courier =
        body.shiprocket_courier.trim();
    }

    if (
      typeof body.shiprocket_status === "string"
    ) {
      update.shiprocket_status =
        body.shiprocket_status.trim();
    }

    const updated = await supabase
      .from("orders")
      .update(update)
      .eq("order_id", orderId)
      .select("*")
      .single();

 if (updated.error) {
  console.error(
    "Order update failed:",
    updated.error,
  );

  return json(
    { detail: "Failed to update order" },
    502,
  );
}

    return json({
      order: updated.data,
    });
  } catch (error) {
    console.error(
      "update-order-status failed:",
      error,
    );

    return json(
      { detail: "Failed to update order status" },
      502,
    );
  }
});