// Demo promo codes. Each resolver takes the current cart context
// (subtotal + whether the member discount is already applied) and
// returns either a numeric rupee amount or null to reject the code.

export const PROMO_CODES = {
  READER10: {
    label: '10% off',
    resolve: ({ subtotal }) => Math.round(subtotal * 0.10),
  },
  LONGTABLE: {
    label: '₹100 off',
    resolve: ({ subtotal }) => (subtotal >= 100 ? 100 : subtotal),
  },
  MEMBER: {
    label: '10% off',
    // Non-stackable with the member discount — reject if
    // `memberDiscountApplied` is true so the UI can show an error.
    resolve: ({ subtotal, memberDiscountApplied }) => {
      if (memberDiscountApplied) return null;
      return Math.round(subtotal * 0.10);
    },
    rejectReason: "Can’t stack MEMBER with the 10% member discount.",
  },
};

export function resolvePromo(rawCode, ctx) {
  const code = String(rawCode || '').trim().toUpperCase();
  if (!code) return { ok: false, message: 'Enter a code first.' };
  const entry = PROMO_CODES[code];
  if (!entry) return { ok: false, message: "We don’t know that code." };
  const amount = entry.resolve(ctx);
  if (amount == null) {
    return { ok: false, message: entry.rejectReason || "That code won’t apply here." };
  }
  return { ok: true, code, amount, message: `Applied — ${entry.label}.` };
}
