// =====================================================================
// Shared helpers for Phase 9 checkout extras (promo codes, loyalty
// points redemption, delivery address resolution). Used by both
// place-pickup-order and create-razorpay-order to keep the server-side
// behaviour identical.
// =====================================================================

// Minimal shape we rely on.
export interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  from: (t: string) => any;
  // deno-lint-ignore no-explicit-any
  rpc: (fn: string, args: any) => Promise<any>;
}

export interface CheckoutExtras {
  fulfillment_type?: "pickup" | "delivery";
  shipping_address_id?: string | null;
  promo_code?: string | null;
  points_to_redeem?: number | null;
  snapshot_id?: string | null;
}

export interface AppliedExtras {
  fulfillment_type: "pickup" | "delivery";
  shipping_address_id: string | null;
  promo_code_id: string | null;
  promo_code: string | null;
  discount: number;
  points_redeemed: number;
  snapshot_id: string | null;
}

/**
 * Resolve promo + points against the given subtotal. Never trusts the
 * client values — re-fetches the promo row and the member's balance.
 * Returns the net discount (promo + points) and the final totals.
 */
export async function applyCheckoutExtras(args: {
  svc: SupabaseLike;
  memberId: string;
  subtotal: number;
  extras: CheckoutExtras;
}): Promise<AppliedExtras> {
  const { svc, memberId, subtotal, extras } = args;

  const fulfillment: "pickup" | "delivery" =
    extras.fulfillment_type === "delivery" ? "delivery" : "pickup";

  // Validate the shipping address belongs to the member if delivery.
  let shipping_address_id: string | null = null;
  if (fulfillment === "delivery" && extras.shipping_address_id) {
    const { data: addr } = await svc
      .from("customer_addresses")
      .select("id, member_id")
      .eq("id", extras.shipping_address_id)
      .maybeSingle();
    if (!addr || addr.member_id !== memberId) {
      throw new Error("invalid_address");
    }
    shipping_address_id = addr.id;
  }

  // Promo code validation.
  let promoDiscount = 0;
  let promo_code_id: string | null = null;
  let promo_code: string | null = null;

  if (extras.promo_code) {
    const code = String(extras.promo_code).trim().toUpperCase();
    const { data: promo } = await svc
      .from("store_promo_codes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();

    const nowIso = new Date().toISOString();
    if (
      promo &&
      (!promo.starts_at || promo.starts_at <= nowIso) &&
      (!promo.expires_at || promo.expires_at >= nowIso) &&
      (!promo.min_total || subtotal >= Number(promo.min_total))
    ) {
      let d = promo.kind === "percent"
        ? (subtotal * Number(promo.value)) / 100
        : Number(promo.value);
      if (promo.max_discount) d = Math.min(d, Number(promo.max_discount));
      promoDiscount = Math.min(d, subtotal);

      // Per-member cap
      if (promo.max_uses_per_member) {
        const { count } = await svc
          .from("store_promo_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("promo_code_id", promo.id)
          .eq("member_id", memberId);
        if ((count || 0) >= promo.max_uses_per_member) {
          promoDiscount = 0;
          promo_code_id = null;
        } else {
          promo_code_id = promo.id;
          promo_code = promo.code;
        }
      } else if (promo.max_uses) {
        const { count } = await svc
          .from("store_promo_redemptions")
          .select("id", { count: "exact", head: true })
          .eq("promo_code_id", promo.id);
        if ((count || 0) >= promo.max_uses) {
          promoDiscount = 0;
        } else {
          promo_code_id = promo.id;
          promo_code = promo.code;
        }
      } else {
        promo_code_id = promo.id;
        promo_code = promo.code;
      }
    }
  }

  // Points redemption (1 pt = ₹1).
  const requested = Math.max(0, Math.floor(Number(extras.points_to_redeem || 0)));
  let points_redeemed = 0;
  const afterPromo = Math.max(0, subtotal - promoDiscount);
  if (requested > 0 && afterPromo > 0) {
    const { data: pts } = await svc
      .from("loyalty_balances")
      .select("balance")
      .eq("member_id", memberId)
      .maybeSingle();
    const balance = pts?.balance ?? 0;
    points_redeemed = Math.min(requested, balance, Math.floor(afterPromo));
  }

  const discount = promoDiscount + points_redeemed;

  return {
    fulfillment_type: fulfillment,
    shipping_address_id,
    promo_code_id,
    promo_code,
    discount,
    points_redeemed,
    snapshot_id: extras.snapshot_id ?? null,
  };
}

/**
 * Post-insert hook: record a promo redemption, debit the member's point
 * balance, and mark the cart snapshot as completed — atomically, via a
 * single SECURITY DEFINER RPC. Falls back to the legacy three-call
 * sequence on RPC error so a stale Postgres function (pre-migration
 * 20260428_signup_inventory_and_finalize_rpc) still completes the order.
 */
export async function finalizeExtrasForOrder(args: {
  svc: SupabaseLike;
  orderId: string;
  memberId: string;
  applied: AppliedExtras;
}) {
  const { svc, orderId, memberId, applied } = args;
  const promoDiscount = Math.max(0, applied.discount - applied.points_redeemed);

  const { error: rpcErr } = await svc.rpc("finalize_order_extras", {
    p_order_id: orderId,
    p_member_id: memberId,
    p_promo_code_id: applied.promo_code_id,
    p_promo_discount: promoDiscount,
    p_points_redeemed: applied.points_redeemed,
    p_snapshot_id: applied.snapshot_id,
  });

  if (!rpcErr) return;

  console.warn("finalize_order_extras RPC failed, falling back", rpcErr);

  if (applied.promo_code_id) {
    await svc.from("store_promo_redemptions").insert({
      promo_code_id: applied.promo_code_id,
      order_id: orderId,
      member_id: memberId,
      discount_amount: promoDiscount,
    });
  }

  if (applied.points_redeemed > 0) {
    await svc.rpc("grant_loyalty_points", {
      p_member_id: memberId,
      p_points: -applied.points_redeemed,
      p_reason: "Redeemed at checkout",
      p_order_id: orderId,
      p_kind: "redeem",
      p_referral_id: null,
    });
  }

  if (applied.snapshot_id) {
    await svc
      .from("cart_snapshots")
      .update({ completed_order_id: orderId })
      .eq("id", applied.snapshot_id);
  }
}
