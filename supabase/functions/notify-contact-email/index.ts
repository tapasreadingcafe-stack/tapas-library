import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Emails the cafe whenever the website contact form is submitted, using
// Resend (https://resend.com) — an HTTP email API that works reliably on
// Supabase Edge (no SMTP ports needed).
//
// All config lives in Supabase secrets (set once in the dashboard), so
// nothing sensitive is ever sent from the browser:
//   RESEND_API_KEY  – your Resend API key (starts with "re_")
//   NOTIFY_TO       – where the alert lands (use the email you signed up
//                     to Resend with, so the free tier can deliver it)
//   NOTIFY_FROM     – optional sender; defaults to Resend's shared
//                     onboarding address (works with no domain setup)
//
// Triggered by the public contact form via supabase.functions.invoke()
// (the anon key satisfies the default JWT check). Also accepts a Supabase
// Database Webhook payload ({ record: {...} }). Failures are logged but
// never block the visitor's thank-you.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const NOTIFY_TO = Deno.env.get("NOTIFY_TO");
    const NOTIFY_FROM = Deno.env.get("NOTIFY_FROM") || "Tapas Reading Cafe <onboarding@resend.dev>";

    if (!RESEND_API_KEY || !NOTIFY_TO) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY / NOTIFY_TO secrets are not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json().catch(() => ({}));
    // Direct client invoke sends the fields at the top level; a Supabase
    // Database Webhook wraps them in `record`.
    const src = (body && typeof body === "object" && body.record) ? body.record : (body || {});
    const fields = (src.fields && typeof src.fields === "object") ? src.fields : {};

    const name = (src.name || fields.name || "").toString().trim() || "(no name)";
    const email = (src.email || fields.email || "").toString().trim();
    const phone = (fields.phone || src.phone || "").toString().trim();
    const subject = (fields.subject || src.subject || "").toString().trim();
    const message = (src.message || fields.message || "").toString().trim();

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a;line-height:1.6">
        <h2 style="margin:0 0 14px">📨 New contact form submission</h2>
        <p style="margin:0 0 4px"><strong>Name:</strong> ${esc(name)}</p>
        <p style="margin:0 0 4px"><strong>Email:</strong> ${email ? esc(email) : "—"}</p>
        <p style="margin:0 0 4px"><strong>Phone:</strong> ${phone ? esc(phone) : "—"}</p>
        <p style="margin:0 0 4px"><strong>Subject:</strong> ${subject ? esc(subject) : "—"}</p>
        <p style="margin:14px 0 6px"><strong>Message:</strong></p>
        <div style="white-space:pre-wrap;padding:12px 14px;background:#f6f8f7;border-radius:8px">${esc(message) || "(empty)"}</div>
        <p style="margin:18px 0 0;color:#6e6e6e;font-size:12px">Sent from the tapasreadingcafe.com contact form.</p>
      </div>`;

    const payload: Record<string, unknown> = {
      from: NOTIFY_FROM,
      to: [NOTIFY_TO],
      subject: `New contact form: ${name}${subject ? " — " + subject : ""}`,
      html,
    };
    if (email) payload.reply_to = email;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Resend error:", res.status, data);
      return new Response(
        JSON.stringify({ error: data?.message || "Resend request failed", status: res.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-contact-email error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message || "Failed to send" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
