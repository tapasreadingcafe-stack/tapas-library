// =====================================================================
// razorpay-webhook
//
// Receives webhook events from Razorpay (configured in the Razorpay
// dashboard → Settings → Webhooks) and reconciles customer_orders
// status asynchronously. Catches the edge case where the browser
// closes between payment and our verify-razorpay-payment call.
//
// Verifies webhook signature using RAZORPAY_WEBHOOK_SECRET (a
// different secret from the API key).
//
// Idempotent — safe to receive the same event multiple times.
// =====================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("method_not_allowed", { status: 405 });
    }

    const signature = req.headers.get("x-razorpay-signature");
    if (!signature) {
      return new Response("missing_signature", { status: 400 });
    }

    const bodyText = await req.text();

    const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("RAZORPAY_WEBHOOK_SECRET not configured");
      return new Response("not_configured", { status: 500 });
    }

    // ---- verify signature -----------------------------------------
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(webhookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(bodyText));
    const computed = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (!timingSafeEqual(computed, signature)) {
      console.warn("webhook signature mismatch");
      return new Response("signature_mismatch", { status: 400 });
    }

    const event = JSON.parse(bodyText);
    const eventType = event?.event;
    const payment = event?.payload?.payment?.entity;
    const razorpayOrderId: string | undefined = payment?.order_id;
    const razorpayPaymentId: string | undefined = payment?.id;

    if (!razorpayOrderId) {
      return new Response(JSON.stringify({ ignored: "no_order_id", event: eventType }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svcClient = createClient(supabaseUrl, supabaseService);

    // Look up the order by razorpay_order_id.
    const { data: order } = await svcClient
      .from("customer_orders")
      .select("id, status")
      .eq("razorpay_order_id", razorpayOrderId)
      .single();

    if (!order) {
      // Webhook arrived before our DB row was created — this should be
      // rare. Log and ack; Razorpay will retry anyway.
      console.warn("webhook order not found", razorpayOrderId);
      return new Response(JSON.stringify({ ok: true, note: "order_not_found_yet" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Idempotency: if already paid/fulfilled, nothing to do.
    const terminalStatuses = ["paid", "ready_for_pickup", "fulfilled", "refunded"];
    if (terminalStatuses.includes(order.status)) {
      return new Response(JSON.stringify({ ok: true, already: order.status }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let newStatus: string | null = null;
    if (eventType === "payment.captured" || eventType === "order.paid") {
      newStatus = "paid";
    } else if (eventType === "payment.failed") {
      newStatus = "cancelled";
    }

    if (newStatus) {
      await svcClient
        .from("customer_orders")
        .update({
          status: newStatus,
          payment_status: newStatus === "paid" ? "paid" : "failed",
          razorpay_payment_id: razorpayPaymentId ?? null,
        })
        .eq("id", order.id);
    }

    return new Response(JSON.stringify({ ok: true, event: eventType, new_status: newStatus }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("razorpay-webhook unexpected error", err);
    return new Response("internal", { status: 500 });
  }
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
