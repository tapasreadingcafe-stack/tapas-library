import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch settings
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", [
        "daily_report_enabled", "daily_report_email", "smtp_email", "smtp_password", "library_name",
        "fine_rate_per_day", "fine_grace_period_days",
      ]);

    const cfg: Record<string, string> = {};
    (settingsData || []).forEach((r: any) => { cfg[r.key] = r.value; });

    // Check if enabled
    if (cfg.daily_report_enabled !== "true" && cfg.daily_report_enabled !== true) {
      return new Response(JSON.stringify({ skipped: true, reason: "Daily report disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = cfg.daily_report_email || cfg.smtp_email;
    if (!recipientEmail || !cfg.smtp_email || !cfg.smtp_password) {
      return new Response(JSON.stringify({ error: "SMTP or recipient email not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate dates
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const weekLater = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];

    // Query all metrics
    const [dueTodayRes, overdueRes, activeRes, posRes, cafeRes, expiringRes] = await Promise.all([
      // Books due today
      supabase.from("circulation").select("id", { count: "exact" }).eq("status", "checked_out").eq("due_date", today),
      // Overdue books
      supabase.from("circulation").select("id, due_date", { count: "exact" }).eq("status", "checked_out").lt("due_date", today),
      // Active checkouts
      supabase.from("circulation").select("id", { count: "exact" }).eq("status", "checked_out"),
      // Yesterday POS revenue
      supabase.from("pos_transactions").select("total_amount").gte("created_at", yesterday + "T00:00:00").lt("created_at", today + "T00:00:00"),
      // Yesterday cafe revenue
      supabase.from("cafe_orders").select("total_amount").gte("created_at", yesterday + "T00:00:00").lt("created_at", today + "T00:00:00").eq("status", "completed"),
      // Expiring memberships
      supabase.from("members").select("id", { count: "exact" }).eq("status", "active").gte("subscription_end", today).lte("subscription_end", weekLater),
    ]);

    const dueTodayCount = dueTodayRes.count || 0;
    const overdueCount = overdueRes.count || 0;
    const activeCheckouts = activeRes.count || 0;
    const expiringMembers = expiringRes.count || 0;

    // Calculate outstanding fines
    const fineRate = Number(cfg.fine_rate_per_day) || 10;
    const gracePeriod = Number(cfg.fine_grace_period_days) || 0;
    let outstandingFines = 0;
    if (overdueRes.data) {
      const now = new Date();
      overdueRes.data.forEach((item: any) => {
        const daysOverdue = Math.floor((now.getTime() - new Date(item.due_date).getTime()) / 86400000);
        const charged = Math.max(0, daysOverdue - gracePeriod);
        outstandingFines += charged * fineRate;
      });
    }

    // Yesterday revenue
    const posRevenue = (posRes.data || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const cafeRevenue = (cafeRes.data || []).reduce((s: number, r: any) => s + (r.total_amount || 0), 0);
    const yesterdayRevenue = posRevenue + cafeRevenue;

    const libraryName = cfg.library_name || "Tapas Reading Cafe";
    const dateStr = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    // Build HTML
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#333;">📊 Daily Report — ${dateStr}</h2>
        <p style="color:#666;">Good morning! Here's your library summary:</p>
        <table style="width:100%;border-collapse:collapse;margin:15px 0;">
          <tr style="background:#f8f9fa;"><td style="padding:12px;border:1px solid #eee;font-weight:600;">📅 Books Due Today</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#3498db;">${dueTodayCount}</td></tr>
          <tr><td style="padding:12px;border:1px solid #eee;font-weight:600;">⚠️ Overdue Books</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:${overdueCount > 0 ? "#e74c3c" : "#27ae60"};">${overdueCount}</td></tr>
          <tr style="background:#f8f9fa;"><td style="padding:12px;border:1px solid #eee;font-weight:600;">💰 Outstanding Fines</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#e74c3c;">₹${outstandingFines.toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding:12px;border:1px solid #eee;font-weight:600;">📖 Active Checkouts</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;">${activeCheckouts}</td></tr>
          <tr style="background:#f8f9fa;"><td style="padding:12px;border:1px solid #eee;font-weight:600;">💵 Yesterday's Revenue</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#27ae60;">₹${yesterdayRevenue.toLocaleString("en-IN")}</td></tr>
          <tr><td style="padding:12px;border:1px solid #eee;font-weight:600;">🔔 Memberships Expiring This Week</td><td style="padding:12px;border:1px solid #eee;font-size:20px;font-weight:700;color:#f39c12;">${expiringMembers}</td></tr>
        </table>
        <p style="color:#888;font-size:12px;margin-top:20px;">— ${libraryName}</p>
      </div>
    `;

    // Send via SMTP (same pattern as notification email)
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: { username: cfg.smtp_email, password: cfg.smtp_password },
      },
    });

    await client.send({
      from: cfg.smtp_email,
      to: recipientEmail,
      subject: `📊 ${libraryName} — Daily Report (${dateStr})`,
      content: "auto",
      html,
    });
    await client.close();

    return new Response(JSON.stringify({
      success: true,
      message: `Report sent to ${recipientEmail}`,
      metrics: { dueTodayCount, overdueCount, outstandingFines, activeCheckouts, yesterdayRevenue, expiringMembers },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Daily report error:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to generate report" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
