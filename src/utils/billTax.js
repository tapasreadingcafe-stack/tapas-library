/* Tax for a POS cart — the bridge between the till and the GST engine.
 *
 * Kept out of POS.js so the arithmetic that decides what a customer pays can
 * be tested on its own, and so the receipt, the cart panel and the stored bill
 * all read one computation rather than three that could drift apart.
 *
 * Each cart line is mapped to its revenue stream, then to that stream's GST
 * settings. Tax is charged on the value AFTER discounts: per-item markdowns are
 * already inside lineNet, and a bill-level discount (promo / manual) is
 * prorated across the revenue lines — never the deposit, which is always
 * collected in full and is not a supply. That is the same allocation
 * revenueStreams.splitByStream uses, so the tax and the revenue reports agree.
 */
import { taxForBill } from './gst';
import { rateForCartItem } from './gstSettings';
import { streamOf, posItemType } from './revenueStreams';
import { lineNet } from './cartUtils';

/** Revenue stream for a cart item, via the same classifier stored bills use. */
export const streamForCartItem = (item) =>
  streamOf({ item_type: posItemType(item), item_name: item?.name });

/**
 * @param cart          POS cart items
 * @param billDiscount  bill-level discount in rupees (promo + manual)
 * @param settings      the gst_settings row
 * @returns the taxForBill result, each line carrying its cartId, stream and HSN
 */
export function billTaxFor(cart, { billDiscount = 0, settings } = {}) {
  const lines = (cart || []).map((item) => {
    const stream = streamForCartItem(item);
    // Per-item first: an MRP-priced can and a made-to-order coffee sit in the
    // same stream but cannot share one inclusive/exclusive answer.
    return { item, stream, net: lineNet(item), cfg: rateForCartItem(settings, stream, item) };
  });

  const revenueNet = lines.filter((l) => !l.cfg.exempt).reduce((s, l) => s + l.net, 0);
  const scale = revenueNet > 0 ? Math.max(0, revenueNet - (Number(billDiscount) || 0)) / revenueNet : 1;

  return taxForBill(lines.map((l) => ({
    name: l.item.name,
    cartId: l.item.cartId,
    stream: l.stream,
    hsn: l.cfg.hsn,
    amount: l.cfg.exempt ? l.net : l.net * scale,
    rate: l.cfg.rate || 0,
    inclusive: l.cfg.inclusive,
    exempt: l.cfg.exempt,
    untaxed: l.cfg.untaxed,
  })));
}
