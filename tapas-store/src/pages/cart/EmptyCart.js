import React from 'react';
import { Link } from 'react-router-dom';

export default function EmptyCart() {
  return (
    <div className="ct-empty">
      <h3>The basket is <em>empty for now.</em></h3>
      <p>
        Start at the shop, or browse the library if youâd rather
        borrow than buy.
      </p>
      <div className="ct-empty-actions">
        <Link to="/shop" className="ct-btn-dark">Browse the shop â</Link>
        <Link to="/library" className="ct-btn-outline">Visit the library â</Link>
      </div>
    </div>
  );
}
