/* Where an event actually lives.
 *
 * Most events are ours: they're booked on our own /events/:slug page. Some
 * aren't — a host runs the whole thing on Luma and we're one of the places
 * people hear about it. Those rows carry `external_url`, and every surface
 * that lists events (the events page, the /links page, the detail page's
 * own CTA) sends people there instead.
 *
 * The one rule worth stating: the label a visitor sees before tapping should
 * name the site they're about to land on. "Book on lu.ma" is honest about
 * leaving; a bare "Register" is not.
 */

/** The link this event should open, or null when it's one of ours. */
export function eventExternalUrl(event) {
  const raw = (event?.external_url || '').trim();
  // Anything that isn't an absolute http(s) URL would resolve against our own
  // domain and 404. The dashboard blocks these on save; this is the guard for
  // rows that predate it.
  return /^https?:\/\//i.test(raw) ? raw : null;
}

/* Whether our LISTINGS should jump straight to the host.
 *
 * The other setting ('page') keeps the listings pointing at our own event
 * page, which is worth it when our cover, description and phone number say
 * more than the host's page does; the link out then sits on that page, at
 * the point of booking. Anything other than an explicit 'page' means direct,
 * so rows written before this setting existed keep their behaviour. */
export function eventOpensDirect(event) {
  return !!eventExternalUrl(event) && event?.external_link_mode !== 'page';
}

/** "lu.ma" out of "https://lu.ma/abc" — what to show a visitor. Null if not external. */
export function eventHost(event) {
  const url = eventExternalUrl(event);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
