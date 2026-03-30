import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Detect if we should augment with Perplexity search
function needsSearch(message: string): boolean {
  const patterns = [
    /how many calories in .+/i,
    /nutrition.*(info|facts|data)/i,
    /is .+ healthy/i,
    /what does .+ contain/i,
    /compare .+ (vs|versus|or) .+/i,
    /calories .+ (from|at|in) .+/i,
    /macros .+ (from|at|in) .+/i,
  ];
  return patterns.some((p) => p.test(message));
}

async function perplexitySearch(query: string): Promise<string | null> {
  if (!PERPLEXITY_API_KEY) return null;

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
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
            content: "You are a nutrition facts assistant. Provide concise, accurate nutrition information. Include calories, protein, carbs, fat per serving. Be brief.",
          },
          { role: "user", content: query },
        ],
        max_tokens: 500,
      }),
    });

    const result = await response.json();
    return result.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, context, imageBase64, imageMediaType } = await req.json();

    const lastUserMessage = messages[messages.length - 1]?.content ?? "";

    // Check if we need Perplexity augmentation
    let searchContext = "";
    if (needsSearch(lastUserMessage)) {
      const searchResult = await perplexitySearch(lastUserMessage);
      if (searchResult) {
        searchContext = `\n\n[SEARCH RESULTS for "${lastUserMessage}"]:\n${searchResult}\n[END SEARCH RESULTS]\nUse these facts in your response. Cite them naturally.`;
      }
    }

    // Build system prompt with user context
    const systemPrompt = `You are CalorRidge, a friendly and knowledgeable AI nutrition and fitness assistant. You help the user track calories, plan meals, and hit their fitness goals.

You have access to the user's real data:
${JSON.stringify(context, null, 2)}${searchContext}

Guidelines:
- Use their actual data to give specific, personalised advice
- Be concise (under 200 words unless they ask for detail)
- When suggesting meals, include macro estimates
- If they ask to log a meal, include metadata with logPrompt containing food_name, calories, protein_g, carbs_g, fat_g
- Never give medical advice. Suggest seeing a professional for medical concerns
- Be encouraging and supportive
- If you reference their data, be specific (e.g. "you've had 1,200 of your 2,000 calorie target")

For responses that include a meal logging prompt, add this JSON at the very end on a new line:
[LOG_PROMPT]{"food_name":"...","calories":...,"protein_g":...,"carbs_g":...,"fat_g":...}[/LOG_PROMPT]`;

    // Build messages array, adding image content block to the last user message if provided
    const apiMessages = messages.map((m: { role: string; content: string }, idx: number) => {
      // Attach image to the last user message
      if (imageBase64 && m.role === "user" && idx === messages.length - 1) {
        return {
          role: m.role,
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageMediaType || "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: m.content,
            },
          ],
        };
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    const result = await response.json();
    let text = result.content?.[0]?.text ?? "Sorry, I couldn't generate a response.";

    // Extract log prompt metadata if present
    let metadata: Record<string, unknown> | undefined;
    const logPromptMatch = text.match(/\[LOG_PROMPT\](.*?)\[\/LOG_PROMPT\]/s);
    if (logPromptMatch) {
      try {
        const logPrompt = JSON.parse(logPromptMatch[1]);
        metadata = { type: "meal_log_prompt", logPrompt };
        text = text.replace(/\[LOG_PROMPT\].*?\[\/LOG_PROMPT\]/s, "").trim();
      } catch {
        // Ignore parse errors
      }
    }

    return new Response(
      JSON.stringify({ content: text, metadata }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
