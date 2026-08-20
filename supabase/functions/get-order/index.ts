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

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET") {
      return json(
        { detail: "method_not_allowed" },
        405,
      );
    }

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

    const url = new URL(req.url);

    const orderId =
      (
        url.searchParams.get("order_id") ||
        url.searchParams.get("orderId") ||
        ""
      ).trim();

    if (!orderId) {
      return json(
        { detail: "not_found" },
        404,
      );
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .maybeSingle();

    if (error) {
      console.error(
        "Order lookup failed:",
        error,
      );

      return json(
        { detail: "Failed to fetch order" },
        502,
      );
    }

    if (!data) {
      return json(
        { detail: "not_found" },
        404,
      );
    }

    return json(data);
  } catch (error) {
    console.error(
      "get-order failed:",
      error,
    );

    return json(
      { detail: "Failed to fetch order" },
      502,
    );
  }
});