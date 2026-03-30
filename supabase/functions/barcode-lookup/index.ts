import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { barcode } = await req.json();

    if (!barcode) {
      return new Response(
        JSON.stringify({ found: false, error: "No barcode provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try Open Food Facts first
    const offResponse = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
    );
    const offData = await offResponse.json();

    if (offData.status === 1 && offData.product) {
      const p = offData.product;
      const n = p.nutriments ?? {};

      return new Response(
        JSON.stringify({
          found: true,
          product: {
            name: p.product_name ?? p.product_name_en ?? "Unknown",
            brand: p.brands ?? "",
            serving_size: p.serving_size ?? "100g",
            nutrition_per_100g: {
              calories: Math.round(n["energy-kcal_100g"] ?? 0),
              protein_g: Math.round((n.proteins_100g ?? 0) * 10) / 10,
              carbs_g: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
              fat_g: Math.round((n.fat_100g ?? 0) * 10) / 10,
              fiber_g: Math.round((n.fiber_100g ?? 0) * 10) / 10,
              sugar_g: Math.round((n.sugars_100g ?? 0) * 10) / 10,
              sodium_mg: Math.round((n.sodium_100g ?? 0) * 1000),
            },
          },
          source: "openfoodfacts",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback: Perplexity search
    if (PERPLEXITY_API_KEY) {
      const pplxResponse = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [{
            role: "user",
            content: `What product has barcode ${barcode}? Provide the product name, brand, and nutrition facts per 100g (calories, protein, carbs, fat, fiber, sugar, sodium).`,
          }],
          max_tokens: 500,
        }),
      });

      const pplxResult = await pplxResponse.json();
      const text = pplxResult.choices?.[0]?.message?.content;

      if (text) {
        return new Response(
          JSON.stringify({
            found: true,
            rawText: text,
            source: "perplexity",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ found: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ found: false, error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
