/* GST engine — Indian tax on a bill line.
 *
 * The rules this encodes, and why each one matters:
 *
 *  - Tax is computed PER LINE, not on the bill total. Different lines carry
 *    different rates (books nil, cafe 5%, services 18%), so a single blended
 *    calculation on the total cannot be reconciled against GSTR-1, which is
 *    filed per rate slab.
 *
 *  - Tax applies to the value AFTER discount. A discount shown on the face of
 *    the invoice reduces the taxable value (CGST s.15(3)(a)).
 *
 *  - A refundable security deposit is NOT a supply, so it carries no GST. It
 *    is passed through untaxed rather than being given a 0% rate, because the
 *    two are different things on a return: an exempt supply is still reported,
 *    a deposit is not consideration at all.
 *
 *  - Intra-state supply splits into CGST + SGST at half the rate each. A cafe
 *    serving walk-ins is always intra-state; IGST is supported for the day an
 *    inter-state supply happens, but nothing selects it automatically.
 *
 *  - Inclusive pricing back-computes tax out of the displayed price, so the
 *    customer pays exactly the amount on the menu. Exclusive adds it on top.
 *    Which one applies is a setting, never an assumption — and it is set PER
 *    LINE, because one bill can hold an exclusive cafe item beside an
 *    inclusive membership.
 *
 *  - A line can also be `untaxed`: GST switched off for that stream. It is
 *    billed at its price with no tax and kept out of taxable value, which is
 *    a different thing from a deposit (`exempt`, not a supply at all).
 *
 * Money is handled in paise internally. Doing this in floating-point rupees
 * lets 0.1 + 0.2 style error accumulate across a bill until the tax lines stop
 * summing to the total — which is exactly the sort of drift that makes a
 * return not reconcile.
 */

const toPaise = (rupees) => Math.round((Number(rupees) || 0) * 100);
const toRupees = (paise) => paise / 100;

/** Half a rate, e.g. 18 -> 9. Kept explicit so the CGST/SGST split is readable. */
export const halfRate = (rate) => (Number(rate) || 0) / 2;

/**
 * Tax for one line.
 *
 * @param amount      line value in rupees, already net of any discount
 * @param rate        GST percentage for this line (0, 5, 12, 18, 28)
 * @param inclusive   true if `amount` already contains the tax
 * @param interState  true for IGST instead of CGST+SGST
 * @param exempt      true for a non-supply (deposit) — no tax, no taxable value
 * @param untaxed     true when GST is switched off for this line's stream
 */
export function taxForLine({ amount, rate = 0, inclusive = true, interState = false, exempt = false, untaxed = false }) {
  const gross = toPaise(amount);

  if (exempt || untaxed || !rate) {
    return {
      taxable: toRupees(gross), cgst: 0, sgst: 0, igst: 0, tax: 0,
      total: toRupees(gross),
      rate: exempt || untaxed ? null : 0,
      exempt: !!exempt,
      untaxed: !!untaxed && !exempt,
    };
  }

  let taxablePaise, taxPaise;
  if (inclusive) {
    // taxable = gross * 100 / (100 + rate); tax is the remainder, so the two
    // always add back to exactly the price on the menu.
    taxablePaise = Math.round((gross * 100) / (100 + rate));
    taxPaise = gross - taxablePaise;
  } else {
    taxablePaise = gross;
    taxPaise = Math.round((gross * rate) / 100);
  }

  let cgst = 0, sgst = 0, igst = 0;
  if (interState) {
    igst = taxPaise;
  } else {
    // Odd paise goes to SGST so cgst + sgst === tax exactly, never ±0.01.
    cgst = Math.floor(taxPaise / 2);
    sgst = taxPaise - cgst;
  }

  return {
    taxable: toRupees(taxablePaise),
    cgst: toRupees(cgst),
    sgst: toRupees(sgst),
    igst: toRupees(igst),
    tax: toRupees(taxPaise),
    total: toRupees(taxablePaise + taxPaise),
    rate,
    exempt: false,
    untaxed: false,
  };
}

/**
 * Tax for a whole bill.
 *
 * `lines` are { amount, rate, exempt }. Returns per-line detail, totals, and a
 * breakdown grouped by rate slab — the shape GSTR-1 is filed in.
 */
export function taxForBill(lines, { inclusive = true, interState = false } = {}) {
  // A line's own `inclusive` wins; the option is only the fallback for lines
  // that don't say, so a single bill can mix the two bases.
  const detail = (lines || []).map((l) => ({
    ...l,
    ...taxForLine({ ...l, inclusive: typeof l.inclusive === 'boolean' ? l.inclusive : inclusive, interState }),
  }));

  const sum = (k) => toRupees(detail.reduce((s, d) => s + toPaise(d[k]), 0));
  // "Taxable value" is the value tax is charged ON, so an exempt line's value
  // must be excluded — it belongs in exemptValue. Summing every line here
  // would overstate taxable turnover on the return by the deposit amount.
  const sumTaxable = () => toRupees(detail.reduce(
    (s, d) => s + (d.exempt || d.untaxed ? 0 : toPaise(d.taxable)), 0));

  const bySlab = {};
  for (const d of detail) {
    if (d.exempt || d.untaxed) continue;
    const key = String(d.rate);
    const b = bySlab[key] || { rate: d.rate, taxable: 0, cgst: 0, sgst: 0, igst: 0, tax: 0 };
    b.taxable += toPaise(d.taxable); b.cgst += toPaise(d.cgst);
    b.sgst += toPaise(d.sgst); b.igst += toPaise(d.igst); b.tax += toPaise(d.tax);
    bySlab[key] = b;
  }
  Object.values(bySlab).forEach((b) => {
    b.taxable = toRupees(b.taxable); b.cgst = toRupees(b.cgst);
    b.sgst = toRupees(b.sgst); b.igst = toRupees(b.igst); b.tax = toRupees(b.tax);
  });

  const grandTotal = sum('total');
  // Invoices are settled to the rupee; the difference is shown as a round-off
  // line rather than silently absorbed into a tax figure.
  const rounded = Math.round(grandTotal);

  return {
    lines: detail,
    taxableValue: sumTaxable(),
    cgst: sum('cgst'),
    sgst: sum('sgst'),
    igst: sum('igst'),
    totalTax: sum('tax'),
    exemptValue: toRupees(detail.filter(d => d.exempt).reduce((s, d) => s + toPaise(d.taxable), 0)),
    untaxedValue: toRupees(detail.filter(d => d.untaxed).reduce((s, d) => s + toPaise(d.taxable), 0)),
    grandTotal,
    roundOff: toRupees(toPaise(rounded) - toPaise(grandTotal)),
    payable: rounded,
    bySlab: Object.values(bySlab).sort((a, b) => a.rate - b.rate),
  };
}
