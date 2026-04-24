import React from 'react';
import { useCart } from '../../context/CartContext';

export function PickupCard() {
  const { pickup, setPickup } = useCart();
  return (
    <section className="ct-side-card is-lime" aria-labelledby="ct-pickup-h">
      <h4 id="ct-pickup-h" className="ct-side-card-title">
        Or pick it up <em>in person.</em>
      </h4>
      <p>
        Free pickup at 14 Haven Street, TueâSun. Weâll hold
        it for seven days.
      </p>
      <label className="ct-pickup-row">
        <input
          type="checkbox"
          checked={pickup}
          onChange={(e) => setPickup(e.target.checked)}
        />
        Pick up instead of shipping
      </label>
    </section>
  );
}

export function GiftWrapCard() {
  const { giftWrap, setGiftWrap } = useCart();
  return (
    <section className="ct-side-card" aria-labelledby="ct-gw-h">
      <div className="ct-giftwrap-row">
        <div className="ct-gw-label">
          <b id="ct-gw-h">Gift wrap</b>
          <span>Cream paper, lime ribbon, handwritten tag. â¹50.</span>
        </div>
        <button
          type="button"
          className={`ct-switch${giftWrap ? ' is-on' : ''}`}
          aria-pressed={giftWrap}
          aria-labelledby="ct-gw-h"
          onClick={() => setGiftWrap(!giftWrap)}
        />
      </div>
    </section>
  );
}

export function NoteCard() {
  const { note, updateNote } = useCart();
  return (
    <section className="ct-side-card" aria-labelledby="ct-note-h">
      <div id="ct-note-h" className="ct-note-label">
        Note to the reader (optional)
      </div>
      <textarea
        className="ct-note-input"
        rows={3}
        placeholder="Handwritten on a cream card and tucked inside. Keep it short â we like it that way."
        value={note}
        maxLength={140}
        onChange={(e) => updateNote(e.target.value)}
      />
      <div className="ct-note-count">{(note || '').length}/140</div>
    </section>
  );
}
