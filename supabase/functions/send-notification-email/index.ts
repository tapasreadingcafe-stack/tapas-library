import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to, subject, html, smtp_email, smtp_password, library_name } = await req.json();

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing to, subject, or html" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!smtp_email || !smtp_password) {
      return new Response(JSON.stringify({ error: "SMTP not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send email via Gmail SMTP using fetch to smtp2go or direct SMTP
    // Using Gmail's SMTP relay via a simple HTTP-to-SMTP bridge
    // Alternative: Use nodemailer-compatible approach with Deno's SMTP

    const emailPayload = {
      from: `${library_name || "Tapas Reading Cafe"} <${smtp_email}>`,
      to: [to],
      subject,
      html,
    };

    // Use SMTP via Deno's built-in capabilities
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: smtp_email,
          password: smtp_password,
        },
      },
    });

    await client.send({
      from: smtp_email,
      to: to,
      subject: subject,
      content: "auto",
      html: html,
    });

    await client.close();

    return new Response(JSON.stringify({ success: true, message: `Email sent to ${to}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Email send error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to send email" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
