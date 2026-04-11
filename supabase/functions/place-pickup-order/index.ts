// =====================================================================
// place-pickup-order
//
// Reserve-and-pay-on-pickup flow used until Razorpay KYC completes.
// Identical to create-razorpay-order except:
//   - skips the Razorpay Orders API call
//   - inserts customer_orders with status='pending',
//     payment_method='cash_on_pickup', payment_status='unpaid'
//   - reserves stock via reserve_book_copy() immediately
//
// Staff marks the order 'paid' in the CustomerOrders dashboard page
// when cash/UPI is collected in-store.
//
// Same auth model as create-razorpay-order: requires a valid
// Supabase user JWT, server-side re-prices the cart from books.
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

interface PickupOrderBody {
  items: CartItem[];
  notes?: string;
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

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "invalid_token" }, 401);

    const svcClient = createClient(supabaseUrl, supabaseService);

    const { data: member, error: memberErr } = await svcClient
      .from("members")
      .select("id, name, email, phone")
      .eq("auth_user_id", user.id)
      .single();
    if (memberErr || !member) return json({ error: "member_not_linked" }, 400);

    const body = (await req.json()) as PickupOrderBody;
    if (!body?.items?.length) return json({ error: "empty_cart" }, 400);

    // ---- server-side price validation + stock reservation ---------
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
    const reservedBookIds: Array<{ book_id: string; qty: number }> = [];

    const rollbackStock = async () => {
      for (const r of reservedBookIds) {
        await svcClient.rpc("release_book_copy", {
          p_book_id: r.book_id,
          p_qty: r.qty,
        });
      }
    };

    for (const item of body.items) {
      if (!item.quantity || item.quantity <= 0) {
        await rollbackStock();
        return json({ error: "invalid_quantity" }, 400);
      }

      if (item.type === "book") {
        if (!item.book_id) {
          await rollbackStock();
          return json({ error: "missing_book_id" }, 400);
        }

        const { data: book } = await svcClient
          .from("books")
          .select("id, title, sales_price, store_visible, quantity_available")
          .eq("id", item.book_id)
          .single();

        if (!book || !book.store_visible || !book.sales_price || book.sales_price <= 0) {
          await rollbackStock();
          return json({ error: "book_not_for_sale", book_id: item.book_id }, 400);
        }

        // Atomic stock reservation.
        const { data: reserved } = await svcClient.rpc("reserve_book_copy", {
          p_book_id: book.id,
          p_qty: item.quantity,
        });
        if (!reserved) {
          await rollbackStock();
          return json({ error: "insufficient_stock", book_id: book.id }, 409);
        }
        reservedBookIds.push({ book_id: book.id, qty: item.quantity });

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
          await rollbackStock();
          return json({ error: "missing_membership_fields" }, 400);
        }
        if (item.quantity !== 1) {
          await rollbackStock();
          return json({ error: "membership_qty_must_be_1" }, 400);
        }
        // Matches the plans table in create-razorpay-order — keep in sync.
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
        if (!plan) {
          await rollbackStock();
          return json({ error: "unknown_plan" }, 400);
        }
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
        await rollbackStock();
        return json({ error: "unknown_item_type" }, 400);
      }
    }

    const total = subtotal;

    // ---- insert customer_orders row --------------------------------
    const { data: order, error: orderErr } = await svcClient
      .from("customer_orders")
      .insert({
        member_id: member.id,
        status: "pending",
        subtotal,
        discount: 0,
        total,
        fulfillment_type: "pickup",
        payment_method: "cash_on_pickup",
        payment_status: "unpaid",
        notes: body.notes ?? null,
      })
      .select("id, order_number")
      .single();

    if (orderErr || !order) {
      console.error("order insert failed", orderErr);
      await rollbackStock();
      return json({ error: "order_create_failed" }, 500);
    }

    const { error: itemsErr } = await svcClient
      .from("customer_order_items")
      .insert(resolvedItems.map((r) => ({ ...r, order_id: order.id })));

    if (itemsErr) {
      console.error("items insert failed", itemsErr);
      await svcClient.from("customer_orders").delete().eq("id", order.id);
      await rollbackStock();
      return json({ error: "order_items_failed" }, 500);
    }

    return json({
      ok: true,
      customer_order_id: order.id,
      order_number: order.order_number,
      total,
    });
  } catch (err) {
    console.error("place-pickup-order unexpected error", err);
    return json({ error: "internal" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
