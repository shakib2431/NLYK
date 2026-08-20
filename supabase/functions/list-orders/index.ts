import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

const supabaseSecretKeys = JSON.parse(
  Deno.env.get("SUPABASE_SECRET_KEYS") || "{}",
);

const supabaseSecret =
  supabaseSecretKeys["default"] ||
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

function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "GET" && req.method !== "POST") {
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

    let email = "";

    if (req.method === "GET") {
      const url = new URL(req.url);
      email = (
        url.searchParams.get("email") || ""
      ).trim();
    } else {
      const body = await req.json();

      email =
        typeof body.email === "string"
          ? body.email.trim()
          : "";
    }

    /*
     * If a valid email is supplied, return only
     * that customer's orders.
     *
     * If no email is supplied, this is the
     * server-side Admin request, so return all
     * orders.
     */
    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    if (email) {
      if (!isValidEmail(email)) {
        return json(
          { detail: "invalid_email" },
          400,
        );
      }

      query = query.eq("email", email);
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        "Order lookup failed:",
        error,
      );

      return json(
        {
          detail: "Failed to fetch orders",
        },
        502,
      );
    }

    return json({
      orders: data || [],
    });
  } catch (error) {
    console.error(
      "list-orders failed:",
      error,
    );

    return json(
      {
        detail: "Failed to fetch orders",
      },
      502,
    );
  }
});