# Cart Page Spec — Tapas Reading Cafe

Full cart at `/cart`, matching the site\u2019s visual language (Fraunces / Inter / JetBrains Mono, lime/pink/purple/ink palette). Nav + footer render normally.

## Sections

1. **Hero** \u2014 pink-dot kicker `\u2022 YOUR BASKET` + "Books waiting *to be read.*" H1 (purple italic second line) + lede about free shipping over \u20B9999. Curve transition.
2. **Items (left column)** \u2014 toolbar with item count + Clear cart link (confirm modal). Each item card has a mini gradient cover, title/metadata, quantity stepper, price block, and an X remove button with a 5s Undo toast.
3. **Paired with** \u2014 3 non-cart books (matches item categories, falls back to first 3). Hidden when cart is empty.
4. **Empty state** \u2014 centered card with "The basket is *empty for now.*" + shop/library CTAs.
5. **Order summary (right column, sticky on desktop)** \u2014 subtotal, member discount (10%), gift wrap (\u20B950 toggle), shipping (free \u2265 \u20B9999 or pickup), GST (5%), total. Promo code input with three demo codes. Checkout button.
6. **Pickup alternate card** \u2014 lime green, toggles pickup; zeroes shipping.
7. **Gift wrap toggle card** \u2014 adds \u20B950.
8. **Note to the reader** \u2014 textarea, 140-char cap, persisted.
9. **Mobile checkout bar** \u2014 fixed-bottom lime bar on phones when the summary scrolls out.

## Promo codes

- `READER10` \u2014 10% off subtotal
- `LONGTABLE` \u2014 flat \u20B9100 off
- `MEMBER` \u2014 10% off (same as member discount); non-stackable with member discount

## Totals math

```
memberDiscount = memberDiscountApplied ? subtotal * 0.10 : 0
promoDiscount  = promoCode?.amount ?? 0
giftWrap       = giftWrap ? 50 : 0
shipping       = pickup ? 0 : (subtotal >= 999 ? 0 : 80)
taxBase        = subtotal \u2212 memberDiscount \u2212 promoDiscount + giftWrap
gst            = round(taxBase * 0.05)
total          = taxBase + shipping + gst
```

## Definition of done

- [ ] `/cart` renders per site pattern; nav + footer render
- [ ] Cart items update qty, show correct cover color from Shop seed
- [ ] Remove toast with 5s undo; Clear cart confirmation modal
- [ ] Promo codes, pickup, gift wrap, note all persist + affect totals
- [ ] Empty state + Paired-with row render correctly
- [ ] Mobile checkout bar appears when summary scrolls out
- [ ] Stub `/checkout` page shows order summary readout
- [ ] Committed + pushed
