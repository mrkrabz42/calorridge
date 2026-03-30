import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 1024;
const MAX_CALORIES = 8000;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody {
  imageBase64: string;
  imageMediaType: string;
  portionNotes?: string;
  imageHash: string;
}

interface ClaudeResponse {
  meal_summary: string;
  food_items: Array<{
    name: string;
    estimated_quantity: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  }>;
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  confidence: number;
  confidence_reason: string;
  portion_note_applied: boolean;
}

function errorResponse(code: string, message: string, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: message, errorCode: code }),
    { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}

function successResponse(data: ClaudeResponse, cached = false) {
  return new Response(
    JSON.stringify({ success: true, data, cached }),
    { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
}

function validateResponse(data: unknown): data is ClaudeResponse {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;

  if (typeof d.meal_summary !== 'string') return false;
  if (!Array.isArray(d.food_items)) return false;
  if (typeof d.totals !== 'object' || d.totals === null) return false;
  if (typeof d.confidence !== 'number') return false;

  const t = d.totals as Record<string, unknown>;
  const requiredTotalFields = ['calories', 'protein_g', 'carbs_g', 'fat_g', 'fiber_g', 'sugar_g', 'sodium_mg'];
  for (const field of requiredTotalFields) {
    if (typeof t[field] !== 'number') return false;
    if ((t[field] as number) < 0) return false;
  }

  if ((t.calories as number) > MAX_CALORIES) return false;
  if (d.confidence < 0 || d.confidence > 1) return false;

  return true;
}

function stripMarkdownFences(text: string): string {
  // Remove ```json ... ``` or ``` ... ``` wrappers
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return errorResponse('INVALID_REQUEST', 'Method not allowed', 405);
  }

  // Parse request
  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return errorResponse('INVALID_REQUEST', 'Invalid JSON body');
  }

  const { imageBase64, imageMediaType, portionNotes, imageHash } = body;

  if (!imageBase64 || !imageMediaType || !imageHash) {
    return errorResponse('INVALID_REQUEST', 'Missing required fields: imageBase64, imageMediaType, imageHash');
  }

  if (!imageMediaType.startsWith('image/')) {
    return errorResponse('INVALID_IMAGE', 'Invalid media type. Must be an image.');
  }

  // Supabase client for cache operations
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Cache lookup
  const { data: cached } = await supabase
    .from('food_cache')
    .select('claude_response, expires_at')
    .eq('image_hash', imageHash)
    .single();

  if (cached && new Date(cached.expires_at) > new Date()) {
    console.log(`Cache hit for hash: ${imageHash}`);
    return successResponse(cached.claude_response as ClaudeResponse, true);
  }

  // Call Claude
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    return errorResponse('CLAUDE_ERROR', 'API key not configured', 500);
  }

  let claudeRaw: string;
  try {
    const claudeResponse = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMediaType,
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: buildUserPrompt(portionNotes),
              },
            ],
          },
        ],
      }),
    });

    if (claudeResponse.status === 429) {
      return errorResponse('RATE_LIMITED', 'Rate limit exceeded. Please retry shortly.', 429);
    }

    if (!claudeResponse.ok) {
      const errText = await claudeResponse.text();
      console.error('Claude API error:', claudeResponse.status, errText);
      return errorResponse('CLAUDE_ERROR', `Claude API error: ${claudeResponse.status}`, 502);
    }

    const claudeData = await claudeResponse.json();
    claudeRaw = claudeData.content?.[0]?.text ?? '';
  } catch (err) {
    console.error('Claude fetch error:', err);
    return errorResponse('CLAUDE_ERROR', 'Failed to reach Claude API', 502);
  }

  // Strip markdown fences and parse JSON
  let parsed: unknown;
  try {
    const cleaned = stripMarkdownFences(claudeRaw);
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error('Parse error:', err, 'Raw response:', claudeRaw);
    return errorResponse('PARSE_ERROR', 'Failed to parse Claude response as JSON');
  }

  // Validate response shape
  if (!validateResponse(parsed)) {
    console.error('Validation error:', JSON.stringify(parsed));
    return errorResponse('VALIDATION_ERROR', 'Claude response did not match expected schema');
  }

  // Cache the result (upsert)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await supabase.from('food_cache').upsert(
    {
      image_hash: imageHash,
      claude_response: parsed,
      expires_at: expiresAt.toISOString(),
    },
    { onConflict: 'image_hash' }
  );

  return successResponse(parsed);
});
