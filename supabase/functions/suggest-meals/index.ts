import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { todayMeals, goals, remaining, pantryItems, mealType, preferences } = await req.json();

    const pantrySection = pantryItems?.length
      ? `\n\nThe user has these ingredients at home: ${pantryItems.join(", ")}. Prefer meals using these.`
      : "";

    const prefSection = preferences ? `\nUser preference: ${preferences}` : "";

    const userPrompt = `Today's meals so far: ${JSON.stringify(todayMeals)}

Daily goals: ${JSON.stringify(goals)}
Remaining macros needed: ${JSON.stringify(remaining)}
Meal type requested: ${mealType}${pantrySection}${prefSection}

Suggest exactly 3 meals. Return JSON only.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: `You are CalorRidge's meal suggestion engine. Given the user's remaining macros for today, suggest exactly 3 meals that help them hit their goals.

Rules:
- Each meal must include: name, brief description (1 sentence), estimated prep time, full macro breakdown, and ingredients list
- Prioritise hitting the remaining macro targets as closely as possible
- If pantry items are provided, prefer meals using those ingredients and note which ones are used
- Keep meals practical, realistic, and easy to make
- Vary the 3 suggestions: one quick/easy, one balanced, one high-protein option
- Include a shopping_tip if helpful
- Return ONLY valid JSON matching this schema:
{
  "suggestions": [
    {
      "name": "string",
      "description": "string",
      "prep_time_mins": number,
      "ingredients": ["string"],
      "macros": { "calories": number, "protein_g": number, "carbs_g": number, "fat_g": number, "fiber_g": number },
      "uses_pantry_items": ["string"]
    }
  ],
  "shopping_tip": "string or null"
}`,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const result = await response.json();
    const text = result.content?.[0]?.text ?? "";

    // Strip markdown fences if present
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
