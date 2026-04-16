// =====================================================================
// ai-assist
//
// Single Deno edge function that routes AI tasks by `task` name. Staff
// hits this from the Books edit drawer, EmailCampaigns, ContactInbox,
// and ReviewsInbox. Customer-side review summaries are refreshed by a
// nightly cron that invokes this function with task='review_summary'.
//
// Auth: requires a staff JWT for write-ish tasks; `review_summary` can
// run unauthenticated when invoked by the scheduled job (verify_jwt is
// disabled in that invocation — see deploy flag).
//
// Uses Claude via the Anthropic API. The API key is pulled from
// ANTHROPIC_API_KEY.
//
// Tasks:
//   book_blurb        { title, author, genre } -> { text }
//   email_subjects    { body, goal? }          -> { suggestions: string[] }
//   reply_draft       { subject, body, context? } -> { text }
//   review_summary    { book_id }              -> { text, persisted: true }
//
// The function never executes data-mutating actions beyond persisting a
// book.review_summary — it just returns text for the UI to show.
// =====================================================================

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

interface AssistBody {
  task: "book_blurb" | "email_subjects" | "reply_draft" | "review_summary";
  title?: string;
  author?: string;
  genre?: string;
  body?: string;
  goal?: string;
  subject?: string;
  context?: string;
  book_id?: string;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function callClaude(system: string, userText: string, maxTokens = 512) {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`anthropic_error_${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const text = (data?.content?.[0]?.text || "").trim();
  if (!text) throw new Error("anthropic_empty_response");
  return text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseService = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const svc = createClient(supabaseUrl, supabaseService);

    const body = (await req.json()) as AssistBody;
    if (!body?.task) return json({ error: "missing_task" }, 400);

    switch (body.task) {
      case "book_blurb": {
        const { title, author, genre } = body;
        if (!title) return json({ error: "missing_title" }, 400);
        const prompt = `Write a warm, literary description (80–110 words) for this book that a small independent reading cafe could show on its online storefront. Keep it factual and inviting, no hyperbole. Avoid clichés like "must-read" or "journey". End with one sentence about who might love it.\n\nTitle: ${title}\nAuthor: ${author || "unknown"}\nGenre: ${genre || "general"}`;
        const text = await callClaude(
          "You are a book copywriter for a neighbourhood reading cafe. Respond with the description only — no preamble, no quotes.",
          prompt,
          400,
        );
        return json({ text });
      }

      case "email_subjects": {
        const { body: content, goal } = body;
        if (!content) return json({ error: "missing_body" }, 400);
        const prompt = `Suggest 5 subject lines for this email. Each 40–60 characters, no emoji, no clickbait, no all-caps. Output as a numbered list only.\n\nGoal: ${goal || "drive engagement"}\n\nBody:\n${content.slice(0, 2000)}`;
        const text = await callClaude(
          "You write tasteful newsletter subject lines for a reading cafe. Output the list only.",
          prompt,
          260,
        );
        const suggestions = text
          .split("\n")
          .map((l) => l.replace(/^[\d.\-)\s]+/, "").trim())
          .filter((l) => l.length > 0)
          .slice(0, 5);
        return json({ suggestions });
      }

      case "reply_draft": {
        const { subject, body: content, context } = body;
        if (!content) return json({ error: "missing_body" }, 400);
        const prompt = `Draft a brief reply (3–5 sentences) to this customer message. Warm but professional, signed off from "The Tapas Reading Cafe team". Don't invent facts we don't have.\n\n${context ? "Context:\n" + context + "\n\n" : ""}Customer subject: ${subject || "(no subject)"}\nCustomer message:\n${content.slice(0, 2000)}`;
        const text = await callClaude(
          "You are a customer-support writer for a reading cafe. Output only the reply text, no preamble.",
          prompt,
          420,
        );
        return json({ text });
      }

      case "review_summary": {
        const { book_id } = body;
        if (!book_id) return json({ error: "missing_book_id" }, 400);
        const { data: book } = await svc.from("books").select("id, title").eq("id", book_id).single();
        const { data: reviews } = await svc
          .from("reviews")
          .select("rating, review_text")
          .eq("book_id", book_id)
          .not("review_text", "is", null)
          .limit(30);
        const textReviews = (reviews || [])
          .map((r) => `★${r.rating || 3}: ${r.review_text}`)
          .join("\n\n");
        if (!textReviews) return json({ text: null });
        const prompt = `Below are member reviews of "${book?.title || "this book"}". Write a 3–4 sentence summary that captures the shared praise and any common criticism. Neutral tone. Do not quote reviewers directly. Start with the overall vibe.\n\n${textReviews.slice(0, 4000)}`;
        const text = await callClaude(
          "You summarize book reviews for a storefront. Output the summary text only.",
          prompt,
          360,
        );
        await svc
          .from("books")
          .update({ review_summary: text, review_summary_updated_at: new Date().toISOString() })
          .eq("id", book_id);
        return json({ text, persisted: true });
      }

      default:
        return json({ error: "unknown_task" }, 400);
    }
  } catch (err) {
    console.error("[ai-assist]", err);
    return json({ error: (err as Error).message || "internal" }, 500);
  }
});
