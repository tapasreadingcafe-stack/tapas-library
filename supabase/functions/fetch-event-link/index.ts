// =====================================================================
// fetch-event-link
//
// Reads a public event page (Luma, Insider, Eventbrite, a partner's own
// site) and hands back the few facts the dashboard's event form needs:
// title, description, cover image, date, time and price.
//
// Why a function and not a fetch from the browser: lu.ma and friends send
// no CORS headers, so the dashboard cannot read their HTML directly. This
// runs server-side, where that restriction doesn't apply.
//
// Nothing is guessed. Two sources, in order of trust:
//   1. JSON-LD (<script type="application/ld+json">) with an Event type -
//      the structured data Google reads. Luma, Eventbrite and Meetup all
//      publish it, and it carries the real start/end time and price.
//   2. OpenGraph meta tags - the title/description/image any decent page
//      has. Used to fill whatever JSON-LD didn't cover.
// A field that neither source gives is returned absent, and the form
// leaves that box for staff to type in.
//
// Auth: staff JWT (the default verify_jwt) - the dashboard invokes it with
// the signed-in staff session.
//
// Deploy either way:
//   * Supabase dashboard -> Edge Functions -> Deploy a new function, name it
//     `fetch-event-link`, paste this whole file. No secrets to set.
//   * or, with the CLI: supabase functions deploy fetch-event-link
//
// Kept to plain ASCII on purpose. This file is deployed by pasting it
// into the Supabase dashboard's editor, and that paste has been seen to
// re-decode UTF-8 as Mac Roman - an em-dash arrives as ",Ai". In a
// comment that is only ugly; in the "..." appended to a truncated
// description it would be saved on the event and shown on the website.
// =====================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// Deliberately NOT imported from ../_shared/cors.ts, unlike the other
// functions here. This one is deployed by pasting the file into the
// Supabase dashboard's function editor, where a sibling file doesn't
// exist - a shared import would simply fail to boot. Kept in step with
// _shared/cors.ts by hand; it's eight lines that never change.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// The cafe's clock. A Luma page states its times with an offset ("...T18:30
// :00+05:30" or a Z time); the form's date and time boxes are local wall
// clock. Converting through this zone is what keeps a 7pm event from
// landing in the form as 1:30pm.
const TZ = "Asia/Kolkata";

const MAX_BYTES = 2 * 1024 * 1024; // a page bigger than this isn't an event page
const TIMEOUT_MS = 12000;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* Refuse anything that isn't a public web page.
 *
 * The URL comes from a signed-in staff member, so this is not the main
 * line of defence - but this function runs inside Supabase's network, and
 * a URL pointing at localhost or a private range would make it a proxy
 * into places a browser could never reach. Cheap to block, so blocked. */
function assertPublicHttpUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a web address.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Only http and https links can be read.");
  }
  const host = u.hostname.toLowerCase();
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "[::1]" ||
    host.startsWith("[fc") ||
    host.startsWith("[fd");
  if (blocked) throw new Error("That address isn't reachable from the internet.");
  return u;
}

async function fetchHtml(url: URL): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        // Some hosts serve a stub to anything that doesn't look like a
        // browser, and the stub has no OpenGraph tags at all.
        "User-Agent":
          "Mozilla/5.0 (compatible; TapasReadingCafe/1.0; +https://www.tapasreadingcafe.com)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-IN,en;q=0.9",
      },
    });
    if (!res.ok) throw new Error(`The page returned ${res.status}.`);
    const type = res.headers.get("content-type") || "";
    if (type && !type.includes("html") && !type.includes("xml")) {
      throw new Error("That link isn't a web page.");
    }
    const buf = await res.arrayBuffer();
    const slice = buf.byteLength > MAX_BYTES ? buf.slice(0, MAX_BYTES) : buf;
    return new TextDecoder("utf-8").decode(slice);
  } finally {
    clearTimeout(timer);
  }
}

/** Minimal entity decode - enough for the text that shows up in meta tags. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

/** og:/twitter:/name= meta content, whichever of the two attribute orders the page used. */
function meta(html: string, key: string): string | null {
  const k = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m && m[1].trim()) return decodeEntities(m[1].trim());
  }
  return null;
}

/** Every JSON-LD block on the page, parsed, flattened through @graph and arrays. */
function jsonLdNodes(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1].trim());
    } catch {
      continue; // one malformed block shouldn't cost us the others
    }
    const walk = (node: unknown) => {
      if (Array.isArray(node)) return node.forEach(walk);
      if (node && typeof node === "object") {
        const obj = node as Record<string, unknown>;
        out.push(obj);
        if (obj["@graph"]) walk(obj["@graph"]);
      }
    };
    walk(parsed);
  }
  return out;
}

function isEventNode(n: Record<string, unknown>): boolean {
  const t = n["@type"];
  const types = Array.isArray(t) ? t : [t];
  return types.some((x) => typeof x === "string" && /event/i.test(x));
}

/** An ISO instant split into the cafe's local date and time. */
function localParts(iso: string): { date: string; time: string } | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value;
  if (!p.year || !p.month || !p.day) return null;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** The cheapest stated price across however offers were shaped. */
function priceFrom(node: Record<string, unknown>): number | null {
  const raw = node["offers"];
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : [raw];
  const prices: number[] = [];
  for (const o of list) {
    if (!o || typeof o !== "object") continue;
    const offer = o as Record<string, unknown>;
    const v = offer["price"] ?? offer["lowPrice"];
    const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
    if (Number.isFinite(n) && n >= 0) prices.push(n);
  }
  return prices.length ? Math.min(...prices) : null;
}

/** Venue name out of the several shapes `location` comes in. */
function locationFrom(node: Record<string, unknown>): string | null {
  const loc = node["location"];
  if (!loc) return null;
  const one = Array.isArray(loc) ? loc[0] : loc;
  if (typeof one === "string") return one.trim() || null;
  if (one && typeof one === "object") {
    const o = one as Record<string, unknown>;
    const name = typeof o["name"] === "string" ? o["name"].trim() : "";
    if (name) return name;
    const addr = o["address"];
    if (typeof addr === "string") return addr.trim() || null;
    if (addr && typeof addr === "object") {
      const a = addr as Record<string, unknown>;
      const bits = ["streetAddress", "addressLocality", "addressRegion"]
        .map((k) => (typeof a[k] === "string" ? (a[k] as string).trim() : ""))
        .filter(Boolean);
      if (bits.length) return bits.join(", ");
    }
  }
  return null;
}

function firstImage(node: Record<string, unknown>): string | null {
  const img = node["image"];
  const one = Array.isArray(img) ? img[0] : img;
  if (typeof one === "string") return one.trim() || null;
  if (one && typeof one === "object") {
    const u = (one as Record<string, unknown>)["url"];
    if (typeof u === "string") return u.trim() || null;
  }
  return null;
}

interface Extracted {
  title?: string;
  description?: string;
  image_url?: string;
  start_date?: string;
  start_time?: string;
  end_date?: string;
  end_time?: string;
  location?: string;
  is_paid?: boolean;
  ticket_price?: number;
}

function extract(html: string, url: URL): Extracted {
  const out: Extracted = {};

  const event = jsonLdNodes(html).find(isEventNode);
  if (event) {
    const name = event["name"];
    if (typeof name === "string" && name.trim()) out.title = decodeEntities(name.trim());

    const desc = event["description"];
    if (typeof desc === "string" && desc.trim()) {
      // Strip any markup the host embedded in the description field.
      out.description = decodeEntities(desc.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
    }

    const img = firstImage(event);
    if (img) out.image_url = img;

    const start = event["startDate"];
    if (typeof start === "string") {
      const p = localParts(start);
      if (p) {
        out.start_date = p.date;
        // A date-only startDate ("2026-09-20") has no time to report, and
        // midnight is not a time anyone meant.
        if (/\d{2}:\d{2}/.test(start)) out.start_time = p.time;
      }
    }
    const end = event["endDate"];
    if (typeof end === "string") {
      const p = localParts(end);
      if (p) {
        out.end_date = p.date;
        if (/\d{2}:\d{2}/.test(end)) out.end_time = p.time;
      }
    }

    const loc = locationFrom(event);
    if (loc) out.location = loc;

    const price = priceFrom(event);
    if (price !== null) {
      out.ticket_price = price;
      out.is_paid = price > 0;
    }
  }

  // OpenGraph fills the gaps. On Luma the og:image is the tile artwork,
  // which is exactly the cover we want.
  if (!out.title) {
    const t = meta(html, "og:title") || meta(html, "twitter:title");
    if (t) out.title = t;
    else {
      const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
      if (m) out.title = decodeEntities(m[1].replace(/\s+/g, " ").trim());
    }
  }
  if (!out.description) {
    const d = meta(html, "og:description") || meta(html, "twitter:description") || meta(html, "description");
    if (d) out.description = d;
  }
  if (!out.image_url) {
    const i = meta(html, "og:image") || meta(html, "twitter:image") || meta(html, "og:image:secure_url");
    if (i) out.image_url = i;
  }

  // A protocol-relative or root-relative image needs the page's own origin
  // to become something an <img> can load.
  if (out.image_url && !/^https?:\/\//i.test(out.image_url)) {
    try {
      out.image_url = new URL(out.image_url, url).toString();
    } catch {
      delete out.image_url;
    }
  }

  // Descriptions on these pages run to several screens. The form's box is
  // for a paragraph, and the full story lives behind the link anyway.
  if (out.description && out.description.length > 600) {
    out.description = out.description.slice(0, 597).trimEnd() + "...";
  }

  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const raw = typeof body?.url === "string" ? body.url.trim() : "";
    if (!raw) return json({ error: "No link given." }, 400);

    const url = assertPublicHttpUrl(raw);
    const html = await fetchHtml(url);
    const fields = extract(html, url);

    const found = Object.keys(fields).filter(
      (k) => fields[k as keyof Extracted] !== undefined && fields[k as keyof Extracted] !== "",
    );
    if (!found.length) {
      return json({
        error: "Nothing readable on that page - fill the details in below.",
      }, 422);
    }

    return json({ source: url.hostname.replace(/^www\./, ""), fields, found });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // A page that times out or blocks us is an ordinary outcome here, not a
    // bug - the form stays usable either way, so say so plainly.
    return json({ error: message.includes("abort") ? "That page took too long to answer." : message }, 400);
  }
});
