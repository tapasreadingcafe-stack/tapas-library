import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Emails the cafe whenever the website contact form is submitted.
//
// All credentials + the recipient live in Supabase secrets (set once in
// the dashboard), so nothing sensitive is ever sent from the browser:
//   SMTP_EMAIL     – the Gmail address that sends the alert
//   SMTP_PASSWORD  – a Gmail App Password (not your normal password)
//   NOTIFY_TO      – where the alert lands (defaults to SMTP_EMAIL)
//
// Triggered by the public contact form via supabase.functions.invoke()
// (the anon key satisfies the default JWT check). Also accepts a Supabase
// Database Webhook payload ({ record: {...} }) if you'd rather wire it
// that way. Failures are logged but never block the visitor.

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
    const SMTP_EMAIL = Deno.env.get("SMTP_EMAIL");
    const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD");
    const NOTIFY_TO = Deno.env.get("NOTIFY_TO") || SMTP_EMAIL;

    if (!SMTP_EMAIL || !SMTP_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "SMTP_EMAIL / SMTP_PASSWORD secrets are not set" }),
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

    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: SMTP_EMAIL, password: SMTP_PASSWORD },
      },
    });

    await client.send({
      from: `Tapas Reading Cafe <${SMTP_EMAIL}>`,
      to: NOTIFY_TO!,
      subject: `New contact form: ${name}${subject ? " — " + subject : ""}`,
      content: "auto",
      html,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true }), {
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
