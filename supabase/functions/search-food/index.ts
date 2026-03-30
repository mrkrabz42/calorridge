import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query?.trim()) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Get nutrition info from Perplexity
    let searchText = "";
    if (PERPLEXITY_API_KEY) {
      const pplxResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content: "Provide detailed nutrition facts. For each food item, include: name, calories per serving, protein (g), carbs (g), fat (g), fiber (g), and typical serving size. Be precise with numbers.",
            },
            {
              role: "user",
              content: `Nutrition facts for: ${query}. Include at least 3 portion/variant options if applicable (e.g. small, medium, large or different preparations).`,
            },
          ],
          max_tokens: 800,
        }),
      });

      const pplxResult = await pplxResponse.json();
      searchText = pplxResult.choices?.[0]?.message?.content ?? "";
    }

    // Step 2: Structure the results with Claude Haiku
    const structurePrompt = searchText
      ? `Extract structured nutrition data from this search result about "${query}":\n\n${searchText}\n\nReturn JSON array only.`
      : `Provide estimated nutrition facts for "${query}" in common serving sizes. Return JSON array only.`;

    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: `Extract or estimate nutrition data and return ONLY a JSON array. Each item must have exactly these fields:
{"name": "string", "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number, "serving_size": "string"}
Return 1-5 items (different portions or variants). No markdown fences, no explanations.`,
        messages: [{ role: "user", content: structurePrompt }],
      }),
    });

    const claudeResult = await claudeResponse.json();
    const text = claudeResult.content?.[0]?.text ?? "[]";
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    let results;
    try {
      results = JSON.parse(cleaned);
      if (!Array.isArray(results)) results = [results];
    } catch {
      results = [];
    }

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message, results: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
