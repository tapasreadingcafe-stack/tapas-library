// ── Cart line maths ───────────────────────────────────────────────────────────
// A cart line can carry its own discount (`disc` + `discType`) so staff can mark
// down a single item — e.g. 10% off the membership but nothing off the
// refundable deposit — without discounting the whole bill. Bill-level promo and
// manual discounts are then applied on top of the line nets.
//
// `discType` is 'pct' (default) or 'fixed'. A fixed discount comes off the LINE
// total, not off each unit.

export const lineGross = (i) => (Number(i?.price) || 0) * (Number(i?.qty) || 0);

export const lineDisc = (i) => {
  const d = Number(i?.disc) || 0;
  if (d <= 0) return 0;
  const gross = lineGross(i);
  return i?.discType === 'fixed'
    ? Math.min(d, gross)
    : Math.min(gross * (d / 100), gross);
};

export const lineNet = (i) => Math.max(0, lineGross(i) - lineDisc(i));

export const lineDiscLabel = (i) =>
  i?.discType === 'fixed' ? `₹${Number(i?.disc) || 0}` : `${Number(i?.disc) || 0}%`;
