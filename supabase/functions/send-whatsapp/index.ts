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
    const { phone, message, whatsapp_api_key, whatsapp_phone_id } = await req.json();

    if (!phone || !message) {
      return new Response(JSON.stringify({ error: "Missing phone or message" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!whatsapp_api_key || !whatsapp_phone_id) {
      return new Response(JSON.stringify({ error: "WhatsApp API not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via WhatsApp Business API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${whatsapp_phone_id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${whatsapp_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: phone,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, message_id: data.messages?.[0]?.id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: data.error?.message || "Failed to send WhatsApp message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err) {
    console.error("WhatsApp send error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Failed to send message" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
