import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Sign in to use your personal tutor." }, 401);
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error } = await client.auth.getUser(auth.slice(7));
    if (error || !user) return json({ error: "Your session expired. Please sign in again." }, 401);
    const { question, subject, language, source, history } = await req.json();
    if (typeof question !== "string" || question.trim().length < 2 || question.length > 5000) {
      return json({ error: "Enter a question between 2 and 5,000 characters." }, 400);
    }
    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "The AI provider is not configured. Add LOVABLE_API_KEY to Supabase function secrets." }, 503);
    const sourceText = typeof source === "string" ? source.slice(0, 12000) : "";
    const messages = [
      { role: "system", content: `You are NU VORA, a patient personal tutor. Teach progressively: explain one idea simply, use a worked example when helpful, then end with one short check-for-understanding question. Never claim a source says something it does not. ${sourceText ? `Treat the supplied source as primary and cite only references included in it. If the source does not answer, say so. Source: ${sourceText}` : "No student source is attached; be clear when you are using general knowledge."} Subject: ${String(subject || "general studies").slice(0, 100)}. Respond in ${language === "ar" ? "clear Arabic, using simple Egyptian Arabic when natural" : "English"}.` },
      ...(Array.isArray(history) ? history.slice(-8).filter((m: { role?: string; content?: string }) => ["user", "assistant"].includes(m.role || "") && typeof m.content === "string").map((m: { role: "user" | "assistant"; content: string }) => ({ role: m.role, content: m.content.slice(0, 3000) })) : []),
      { role: "user", content: question.trim() },
    ];
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/gpt-5.6-sol", reasoning_effort: "none", messages }),
    });
    if (!response.ok) {
      console.error("Study tutor provider error", response.status, (await response.text()).slice(0, 400));
      return json({ error: response.status === 429 ? "Tutor is busy. Try again in a minute." : response.status === 402 ? "AI provider credits are unavailable." : "The tutor could not answer right now." }, response.status === 429 ? 429 : response.status === 402 ? 402 : 502);
    }
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return json({ error: "The tutor returned an empty answer. Try again." }, 502);
    return json({ answer });
  } catch (error) {
    console.error("Study tutor failed", error);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
