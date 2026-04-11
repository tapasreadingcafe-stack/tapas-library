// =====================================================================
// create-razorpay-order
//
// Invoked by tapas-store's Checkout page when the customer clicks
// "Pay". Creates a row in customer_orders (+ customer_order_items),
// then calls the Razorpay Orders API to create a payment order,
// and returns the razorpay_order_id + key_id so the frontend can
// open the Razorpay checkout modal.
//
// Auth: requires a valid Supabase user JWT in the Authorization header.
// Input: { items: CartItem[], notes?: string }
//   CartItem = { type: 'book'|'membership',
//                book_id?: string,
//                membership_plan?: string,
//                membership_days?: number,
//                quantity: number }
// Output: { razorpay_order_id, customer_order_id, amount, currency, key_id }
//
// Never trusts prices from the client — re-fetches from DB.
//
// Environment variables (set via `supabase secrets set`):
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//   SUPABASE_URL            (auto)
//   SUPABASE_ANON_KEY       (auto)
//   SUPABASE_SERVICE_ROLE_KEY (auto)
// =====================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

interface CartItem {
  type: "book" | "membership";
  book_id?: string;
  membership_plan?: string;
  membership_days?: number;
  quantity: number;
}

interface CreateOrderBody {
  items: CartItem[];
  notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---- auth ------------------------------------------------------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "missing_auth" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client honoring the user's JWT — used only to verify the user.
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: "invalid_token" }, 401);
    }

    // Service client for writes — bypasses RLS intentionally.
    const svcClient = createClient(supabaseUrl, supabaseService);

    // ---- resolve member -------------------------------------------
    const { data: member, error: memberErr } = await svcClient
      .from("members")
      .select("id, name, email, phone")
      .eq("auth_user_id", user.id)
      .single();

    if (memberErr || !member) {
      return json({ error: "member_not_linked" }, 400);
    }

    // ---- parse body -----------------------------------------------
    const body = (await req.json()) as CreateOrderBody;
    if (!body?.items?.length) {
      return json({ error: "empty_cart" }, 400);
    }

    // ---- server-side price validation -----------------------------
    let subtotal = 0;
    const resolvedItems: Array<{
      item_type: "book" | "membership";
      book_id: string | null;
      membership_plan: string | null;
      membership_days: number | null;
      item_name: string;
      unit_price: number;
      quantity: number;
      total_price: number;
    }> = [];

    for (const item of body.items) {
      if (!item.quantity || item.quantity <= 0) {
        return json({ error: "invalid_quantity" }, 400);
      }

      if (item.type === "book") {
        if (!item.book_id) return json({ error: "missing_book_id" }, 400);

        const { data: book, error: bookErr } = await svcClient
          .from("books")
          .select("id, title, sales_price, store_visible, quantity_available")
          .eq("id", item.book_id)
          .single();

        if (bookErr || !book) return json({ error: "book_not_found", book_id: item.book_id }, 400);
        if (!book.store_visible) return json({ error: "book_not_for_sale", book_id: item.book_id }, 400);
        if (!book.sales_price || book.sales_price <= 0) {
          return json({ error: "book_no_price", book_id: item.book_id }, 400);
        }
        if ((book.quantity_available ?? 0) < item.quantity) {
          return json({ error: "insufficient_stock", book_id: item.book_id }, 400);
        }

        const unit = Number(book.sales_price);
        const line = unit * item.quantity;
        subtotal += line;
        resolvedItems.push({
          item_type: "book",
          book_id: book.id,
          membership_plan: null,
          membership_days: null,
          item_name: book.title,
          unit_price: unit,
          quantity: item.quantity,
          total_price: line,
        });
      } else if (item.type === "membership") {
        if (!item.membership_plan || !item.membership_days) {
          return json({ error: "missing_membership_fields" }, 400);
        }

        // Pricing comes from app_settings.membership_plans (JSON) — future
        // work. For now, accept a simple server-side lookup table.
        const plans: Record<string, { price: number; name: string }> = {
          basic: { price: 199, name: "Basic Membership" },
          silver: { price: 499, name: "Silver Membership" },
          gold: { price: 999, name: "Gold Membership" },
          premium: { price: 1999, name: "Premium Membership" },
          family: { price: 2499, name: "Family Membership" },
          student: { price: 299, name: "Student Membership" },
          day_pass: { price: 49, name: "Day Pass" },
        };
        const plan = plans[item.membership_plan];
        if (!plan) return json({ error: "unknown_plan", plan: item.membership_plan }, 400);
        if (item.quantity !== 1) return json({ error: "membership_qty_must_be_1" }, 400);

        subtotal += plan.price;
        resolvedItems.push({
          item_type: "membership",
          book_id: null,
          membership_plan: item.membership_plan,
          membership_days: item.membership_days,
          item_name: plan.name,
          unit_price: plan.price,
          quantity: 1,
          total_price: plan.price,
        });
      } else {
        return json({ error: "unknown_item_type" }, 400);
      }
    }

    const total = subtotal; // discount handling deferred
    const amountPaise = Math.round(total * 100);

    // ---- insert pending customer_order ----------------------------
    const { data: order, error: orderErr } = await svcClient
      .from("customer_orders")
      .insert({
        member_id: member.id,
        status: "pending",
        subtotal,
        discount: 0,
        total,
        fulfillment_type: "pickup",
        payment_method: "razorpay",
        payment_status: "pending",
        notes: body.notes ?? null,
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      console.error("order insert failed", orderErr);
      return json({ error: "order_create_failed" }, 500);
    }

    // Insert line items.
    const itemsToInsert = resolvedItems.map((r) => ({ ...r, order_id: order.id }));
    const { error: itemsErr } = await svcClient.from("customer_order_items").insert(itemsToInsert);
    if (itemsErr) {
      console.error("items insert failed", itemsErr);
      // Roll back the order row.
      await svcClient.from("customer_orders").delete().eq("id", order.id);
      return json({ error: "order_items_failed" }, 500);
    }

    // ---- call Razorpay Orders API ---------------------------------
    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (!keyId || !keySecret) {
      return json({ error: "razorpay_not_configured" }, 500);
    }

    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: String(order.order_number),
        notes: {
          customer_order_id: order.id,
          member_id: member.id,
        },
      }),
    });

    if (!rzpRes.ok) {
      const text = await rzpRes.text();
      console.error("razorpay order create failed", rzpRes.status, text);
      await svcClient
        .from("customer_orders")
        .update({ status: "cancelled", notes: `Razorpay create failed: ${text.slice(0, 200)}` })
        .eq("id", order.id);
      return json({ error: "razorpay_create_failed" }, 502);
    }

    const rzpOrder = await rzpRes.json();

    // Persist the razorpay_order_id on the row so verify can find it.
    await svcClient
      .from("customer_orders")
      .update({ razorpay_order_id: rzpOrder.id })
      .eq("id", order.id);

    return json({
      razorpay_order_id: rzpOrder.id,
      customer_order_id: order.id,
      order_number: order.order_number,
      amount: amountPaise,
      currency: "INR",
      key_id: keyId,
      member: { name: member.name, email: member.email, phone: member.phone },
    }, 200);
  } catch (err) {
    console.error("create-razorpay-order unexpected error", err);
    return json({ error: "internal" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
