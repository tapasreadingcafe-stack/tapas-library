// =====================================================================
// verify-razorpay-payment
//
// Invoked by tapas-store's Checkout page in the Razorpay success
// handler. HMAC-verifies the signature (proving the payment really
// came from Razorpay), then marks the matching customer_orders row
// as `paid`.
//
// Input: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
// Output: { ok: true, customer_order_id } | { ok: false, error }
// =====================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface VerifyBody {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "missing_auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "invalid_token" }, 401);

    const svcClient = createClient(supabaseUrl, supabaseService);

    const body = (await req.json()) as VerifyBody;
    if (!body?.razorpay_order_id || !body?.razorpay_payment_id || !body?.razorpay_signature) {
      return json({ error: "missing_fields" }, 400);
    }

    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keySecret) return json({ error: "razorpay_not_configured" }, 500);

    // ---- HMAC-SHA256 verification ---------------------------------
    // Razorpay signs `${razorpay_order_id}|${razorpay_payment_id}` with
    // the secret key. We recompute and compare in constant time.
    const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;

    const encoder = new TextEncoder();
    const keyData = encoder.encode(keySecret);
    const msgData = encoder.encode(payload);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
    const computed = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!timingSafeEqual(computed, body.razorpay_signature)) {
      console.warn("razorpay signature mismatch", { payload });
      return json({ error: "signature_mismatch" }, 400);
    }

    // ---- look up the order ----------------------------------------
    const { data: order, error: orderErr } = await svcClient
      .from("customer_orders")
      .select("id, member_id, status")
      .eq("razorpay_order_id", body.razorpay_order_id)
      .single();

    if (orderErr || !order) {
      return json({ error: "order_not_found" }, 404);
    }

    // Authorization check: the calling user must own the order.
    const { data: ownerMember } = await svcClient
      .from("members")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!ownerMember || ownerMember.id !== order.member_id) {
      return json({ error: "not_order_owner" }, 403);
    }

    // Idempotency: if already paid, just return success.
    if (order.status === "paid" || order.status === "ready_for_pickup" || order.status === "fulfilled") {
      return json({ ok: true, customer_order_id: order.id, already: true });
    }

    // ---- mark paid ------------------------------------------------
    const { error: updateErr } = await svcClient
      .from("customer_orders")
      .update({
        status: "paid",
        payment_status: "paid",
        razorpay_payment_id: body.razorpay_payment_id,
        razorpay_signature: body.razorpay_signature,
      })
      .eq("id", order.id);

    if (updateErr) {
      console.error("order update failed", updateErr);
      return json({ error: "order_update_failed" }, 500);
    }

    return json({ ok: true, customer_order_id: order.id });
  } catch (err) {
    console.error("verify-razorpay-payment unexpected error", err);
    return json({ error: "internal" }, 500);
  }
});

// Constant-time string comparison to avoid leaking info via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
