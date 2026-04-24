// Indian number formatting for rupee values across the cart page.
export const inr = new Intl.NumberFormat('en-IN');
export function rupees(n) { return `â¹${inr.format(Math.round(Number(n) || 0))}`; }

// Pluralise "item"/"items" for the toolbar count row.
export function pluralItems(n) { return n === 1 ? 'item' : 'items'; }
export function pluralTitles(n) { return n === 1 ? 'title' : 'titles'; }
