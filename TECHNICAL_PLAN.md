# CalorRidge v2 — Complete Technical Plan

> Full-scale AI-powered health, nutrition and fitness app.
> Snap meals, scan barcodes, log workouts, run 30-day challenges,
> get AI meal suggestions, and chat with CalorRidge about anything nutrition/fitness.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [New Database Schema](#2-new-database-schema)
3. [New Edge Functions](#3-new-edge-functions)
4. [New App Screens & Navigation](#4-new-app-screens--navigation)
5. [Feature: Barcode & Brand Label Scanning](#5-feature-barcode--brand-label-scanning)
6. [Feature: Workout Tracking](#6-feature-workout-tracking)
7. [Feature: 30-Day Challenges](#7-feature-30-day-challenges)
8. [Feature: AI Meal Suggestions](#8-feature-ai-meal-suggestions)
9. [Feature: AI Chat (CalorRidge Assistant)](#9-feature-ai-chat-calorridge-assistant)
10. [Feature: Enhanced Goal Setting](#10-feature-enhanced-goal-setting)
11. [Feature: Ingredient Pantry](#11-feature-ingredient-pantry)
12. [New Packages](#12-new-packages)
13. [API Keys & Secrets](#13-api-keys--secrets)
14. [Migration Strategy](#14-migration-strategy)
15. [Implementation Order](#15-implementation-order)
16. [Mobile Optimisation Notes](#16-mobile-optimisation-notes)
17. [Cost Estimate](#17-cost-estimate)

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   EXPO APP                       │
│                                                  │
│  Tabs: Dashboard | Log | Suggestions | Chat | +  │
│                                                  │
│  Screens: Challenges, Workouts, Pantry, Goals    │
│                                                  │
│  State: Zustand (mealsStore, goalsStore,         │
│         workoutsStore, challengeStore, chatStore)│
│                                                  │
│  Camera + expo-barcode-scanner + Gallery         │
├─────────────────────────────────────────────────┤
│              SUPABASE BACKEND                    │
│                                                  │
│  Edge Functions:                                 │
│    analyze-meal (existing)                       │
│    suggest-meals         ← Claude Sonnet         │
│    chat                  ← Claude Sonnet         │
│    barcode-lookup        ← OpenFoodFacts API     │
│    search-food           ← Perplexity API        │
│                                                  │
│  Database: PostgreSQL                            │
│    meals, daily_goals, food_cache (existing)     │
│    workouts, exercises, workout_templates        │
│    challenges, challenge_days                    │
│    chat_conversations, chat_messages             │
│    pantry_items                                  │
│    barcode_cache                                 │
│                                                  │
│  Storage: meal-photos, chat-images               │
└─────────────────────────────────────────────────┘
```

**AI Model Strategy:**
- **Claude Haiku 4.5** — meal photo analysis (fast, cheap, existing)
- **Claude Sonnet 4.6** — meal suggestions + chat (smarter reasoning needed for plans/advice)
- **Perplexity API** — real-time food/nutrition search when user asks about specific brands, restaurants, or nutrition facts that need up-to-date data (chat fallback + barcode miss lookups)

---

## 2. New Database Schema

### Migration: `003_workouts.sql`

```sql
-- ============================================================
-- EXERCISES (reference library)
-- ============================================================
CREATE TABLE exercises (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
    'cardio', 'strength', 'flexibility', 'sports', 'other'
  )),
  -- calories burned per minute (rough default, user weight adjusts at runtime)
  cals_per_min_default NUMERIC(6,2),
  met_value   NUMERIC(5,2),  -- Metabolic Equivalent of Task
  is_custom   BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed with common exercises
INSERT INTO exercises (name, category, met_value, cals_per_min_default) VALUES
  ('Running (6 mph)', 'cardio', 9.8, 10.0),
  ('Walking (3.5 mph)', 'cardio', 3.5, 4.0),
  ('Cycling (moderate)', 'cardio', 6.8, 7.5),
  ('Swimming (laps)', 'cardio', 7.0, 8.0),
  ('Jump Rope', 'cardio', 11.0, 12.0),
  ('HIIT', 'cardio', 8.0, 9.0),
  ('Rowing Machine', 'cardio', 7.0, 7.5),
  ('Elliptical', 'cardio', 5.0, 5.5),
  ('Stairmaster', 'cardio', 9.0, 9.5),
  ('Weight Training (moderate)', 'strength', 3.5, 4.0),
  ('Weight Training (vigorous)', 'strength', 6.0, 6.5),
  ('Bodyweight Exercises', 'strength', 3.8, 4.2),
  ('Deadlifts', 'strength', 6.0, 6.5),
  ('Squats', 'strength', 5.0, 5.5),
  ('Bench Press', 'strength', 3.5, 4.0),
  ('Pull-ups', 'strength', 3.8, 4.2),
  ('Yoga', 'flexibility', 2.5, 3.0),
  ('Stretching', 'flexibility', 2.3, 2.5),
  ('Pilates', 'flexibility', 3.0, 3.5),
  ('Basketball', 'sports', 6.5, 7.0),
  ('Football', 'sports', 8.0, 8.5),
  ('Tennis', 'sports', 7.3, 8.0),
  ('Boxing', 'sports', 7.8, 8.5);

-- ============================================================
-- WORKOUTS (logged sessions)
-- ============================================================
CREATE TABLE workouts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id     UUID REFERENCES exercises(id),
  exercise_name   TEXT NOT NULL,          -- denormalised for speed
  category        TEXT NOT NULL,
  workout_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_mins   INTEGER NOT NULL,
  calories_burned INTEGER NOT NULL,       -- calculated: MET * weight_kg * duration_hrs * 1.05
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workouts_date ON workouts(workout_date DESC);

CREATE TRIGGER workouts_updated_at
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- DAILY CALORIE BALANCE VIEW (meals in - workouts out)
-- ============================================================
CREATE VIEW daily_calorie_balance AS
SELECT
  COALESCE(m.meal_date, w.workout_date) AS day_date,
  COALESCE(m.total_calories, 0) AS calories_consumed,
  COALESCE(w.total_burned, 0) AS calories_burned,
  COALESCE(m.total_calories, 0) - COALESCE(w.total_burned, 0) AS net_calories,
  COALESCE(m.meal_count, 0) AS meal_count,
  COALESCE(w.workout_count, 0) AS workout_count
FROM
  (SELECT meal_date, SUM(calories) AS total_calories, COUNT(*) AS meal_count
   FROM meals GROUP BY meal_date) m
FULL OUTER JOIN
  (SELECT workout_date, SUM(calories_burned) AS total_burned, COUNT(*) AS workout_count
   FROM workouts GROUP BY workout_date) w
ON m.meal_date = w.workout_date;

-- RLS
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to exercises"
  ON exercises FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to workouts"
  ON workouts FOR ALL TO anon USING (true) WITH CHECK (true);
```

### Migration: `004_challenges.sql`

```sql
-- ============================================================
-- CHALLENGES (30-day plans)
-- ============================================================
CREATE TABLE challenges (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            TEXT NOT NULL,              -- e.g. "March Cut", "April Bulk"
  goal_type       TEXT NOT NULL CHECK (goal_type IN ('cut', 'bulk', 'maintain', 'custom')),
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  duration_days   INTEGER NOT NULL DEFAULT 30,
  -- Target macros for the challenge (can differ from daily_goals)
  target_calories INTEGER NOT NULL,
  target_protein_g NUMERIC(6,2) NOT NULL,
  target_carbs_g  NUMERIC(6,2) NOT NULL,
  target_fat_g    NUMERIC(6,2) NOT NULL,
  target_fiber_g  NUMERIC(6,2),
  -- User body stats at challenge start
  start_weight_kg NUMERIC(5,1),
  target_weight_kg NUMERIC(5,1),
  is_active       BOOLEAN DEFAULT true,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CHALLENGE DAYS (daily check-in data)
-- ============================================================
CREATE TABLE challenge_days (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id    UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  day_number      INTEGER NOT NULL CHECK (day_number >= 1),
  day_date        DATE NOT NULL,
  -- Actual intake (auto-summed from meals, but user can override)
  actual_calories INTEGER,
  actual_protein_g NUMERIC(6,2),
  actual_carbs_g  NUMERIC(6,2),
  actual_fat_g    NUMERIC(6,2),
  -- Workout calories burned (auto-summed from workouts)
  calories_burned INTEGER DEFAULT 0,
  -- Daily weigh-in (optional)
  weight_kg       NUMERIC(5,1),
  -- Status
  completed       BOOLEAN DEFAULT false,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(challenge_id, day_number)
);

CREATE INDEX idx_challenge_days_lookup ON challenge_days(challenge_id, day_date);

CREATE TRIGGER challenge_days_updated_at
  BEFORE UPDATE ON challenge_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to challenges"
  ON challenges FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to challenge_days"
  ON challenge_days FOR ALL TO anon USING (true) WITH CHECK (true);
```

### Migration: `005_chat_and_pantry.sql`

```sql
-- ============================================================
-- CHAT CONVERSATIONS
-- ============================================================
CREATE TABLE chat_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chat_messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content           TEXT NOT NULL,
  -- Optional structured data (e.g. meal suggestion cards, workout plans)
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_convo ON chat_messages(conversation_id, created_at);

CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- PANTRY (what ingredients the user has at home)
-- ============================================================
CREATE TABLE pantry_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT CHECK (category IN (
    'protein', 'carb', 'fat', 'dairy', 'vegetable',
    'fruit', 'grain', 'spice', 'sauce', 'other'
  )),
  quantity    TEXT,           -- freeform: "500g", "2 cans", "half a bag"
  is_staple   BOOLEAN DEFAULT false,  -- always in stock (salt, oil, etc)
  expires_at  DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pantry_items_updated_at
  BEFORE UPDATE ON pantry_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- BARCODE CACHE
-- ============================================================
CREATE TABLE barcode_cache (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode         TEXT NOT NULL UNIQUE,
  product_name    TEXT,
  brand           TEXT,
  nutrition_per_100g JSONB,    -- { calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg }
  serving_size    TEXT,
  source          TEXT NOT NULL DEFAULT 'openfoodfacts',  -- openfoodfacts | perplexity | manual
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_barcode_cache ON barcode_cache(barcode);

-- ============================================================
-- USER PROFILE (body stats for calorie calculations)
-- ============================================================
CREATE TABLE user_profile (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  weight_kg       NUMERIC(5,1),
  height_cm       NUMERIC(5,1),
  age             INTEGER,
  sex             TEXT CHECK (sex IN ('male', 'female')),
  activity_level  TEXT CHECK (activity_level IN (
    'sedentary', 'light', 'moderate', 'active', 'very_active'
  )),
  goal_type       TEXT CHECK (goal_type IN ('cut', 'bulk', 'maintain')),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed empty profile
INSERT INTO user_profile DEFAULT VALUES;

CREATE TRIGGER user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to chat_conversations"
  ON chat_conversations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to chat_messages"
  ON chat_messages FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to pantry_items"
  ON pantry_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to barcode_cache"
  ON barcode_cache FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to user_profile"
  ON user_profile FOR ALL TO anon USING (true) WITH CHECK (true);
```

---

## 3. New Edge Functions

### 3a. `suggest-meals` — AI Meal Suggestions

**Trigger:** User opens Suggestions tab or requests suggestions.

**Input:**
```typescript
{
  todayMeals: { food_name: string, calories: number, protein_g: number, carbs_g: number, fat_g: number }[],
  goals: { calories: number, protein_g: number, carbs_g: number, fat_g: number, fiber_g: number },
  remaining: { calories: number, protein_g: number, carbs_g: number, fat_g: number },
  pantryItems?: string[],          // optional: what user has at home
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
  preferences?: string             // e.g. "quick, under 15 mins"
}
```

**Model:** Claude Sonnet 4.6

**System Prompt Core:**
```
You are CalorRidge's meal suggestion engine. Given the user's remaining
macros for the day, suggest exactly 3 meals that help them hit their goals.

Rules:
- Each meal must include: name, brief description (1 sentence), estimated
  prep time, full macro breakdown (cal, protein, carbs, fat, fiber)
- Prioritise hitting the remaining macro targets as closely as possible
- If pantry items provided, prefer meals using those ingredients
- Keep meals practical and realistic (no obscure ingredients)
- Vary the 3 suggestions: one quick/easy, one balanced, one high-protein
- Return JSON only, no markdown
```

**Output:**
```typescript
{
  suggestions: [
    {
      name: string,
      description: string,
      prep_time_mins: number,
      ingredients: string[],
      macros: { calories: number, protein_g: number, carbs_g: number, fat_g: number, fiber_g: number },
      uses_pantry_items: string[]   // which pantry items it uses
    }
  ],
  shopping_tip?: string  // e.g. "Grab some Greek yoghurt to easily hit protein"
}
```

### 3b. `chat` — CalorRidge AI Assistant

**Model:** Claude Sonnet 4.6

**Input:**
```typescript
{
  messages: { role: 'user' | 'assistant', content: string }[],
  context: {
    todayMeals: Meal[],
    goals: DailyGoals,
    recentWorkouts: Workout[],
    activeChallenge?: Challenge,
    challengeProgress?: ChallengeDaySummary[],
    userProfile?: UserProfile,
    pantryItems?: string[]
  }
}
```

**System Prompt Core:**
```
You are CalorRidge, a friendly and knowledgeable AI nutrition and fitness
assistant. The user is tracking their calories, meals and workouts.

You have access to their real data (provided in context). Use it to give
specific, personalised advice. Be concise but helpful.

You can help with:
- Nutrition questions ("is 150g protein enough for a bulk?")
- Meal planning ("what should I eat for dinner to hit my goals?")
- Workout advice ("how many calories does a 30 min run burn?")
- Challenge check-ins ("how am I doing this week?")
- General health questions
- Analysing their eating patterns
- Suggesting grocery lists

Keep responses under 200 words unless the user asks for detail.
Never give medical advice. Suggest seeing a professional for medical concerns.
```

**Perplexity Integration:** When the user asks about specific branded products, restaurant menus, or current nutrition science, the edge function calls Perplexity's API first to get up-to-date facts, then feeds those into Claude's response.

**Perplexity Trigger Detection:**
```typescript
// In the chat edge function, detect when Perplexity search would help
const needsSearch = (message: string): boolean => {
  const searchPatterns = [
    /how many calories in .+ from .+/i,    // "calories in a Big Mac from McDonald's"
    /nutrition.*(info|facts|data).+brand/i,
    /is .+ healthy/i,                       // needs current research
    /what does .+ contain/i,
    /compare .+ (vs|versus|or) .+/i,
  ];
  return searchPatterns.some(p => p.test(message));
};
```

### 3c. `barcode-lookup` — Product Nutrition from Barcode

**Pipeline:**
1. Check `barcode_cache` table first
2. If miss → call Open Food Facts API (free, no key needed): `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`
3. If OFF miss → call Perplexity: "What is the nutrition information for barcode {barcode}?"
4. Cache result in `barcode_cache` table
5. Return standardised nutrition data

**Output:**
```typescript
{
  found: boolean,
  product?: {
    name: string,
    brand: string,
    serving_size: string,
    nutrition_per_100g: {
      calories: number, protein_g: number, carbs_g: number,
      fat_g: number, fiber_g: number, sugar_g: number, sodium_mg: number
    },
    nutrition_per_serving: { ... }  // calculated from serving_size
  },
  source: 'cache' | 'openfoodfacts' | 'perplexity'
}
```

### 3d. `search-food` — Perplexity-Powered Food Search

For when the user types a food name (not scanning) and wants nutrition data.

**Input:** `{ query: "Greggs sausage roll" }`

**Pipeline:**
1. Call Perplexity API with: `"Nutrition facts for {query}. Return calories, protein, carbs, fat, fiber, sugar, sodium per serving. Include serving size."`
2. Parse response with Claude Haiku (structured extraction)
3. Return standardised nutrition object

---

## 4. New App Screens & Navigation

### Updated Tab Layout

```
(tabs)/
  dashboard.tsx       ← existing (enhanced with workout + challenge summary)
  log.tsx             ← existing (add workout entries to timeline)
  suggestions.tsx     ← NEW: AI meal suggestions
  chat.tsx            ← NEW: CalorRidge AI chat
  settings.tsx        ← existing (enhanced with profile)

Modals/Stacks:
  /meal/capture       ← existing
  /meal/confirm       ← existing
  /meal/detail/[id]   ← existing
  /meal/barcode       ← NEW: barcode scanner
  /meal/search        ← NEW: text search for food
  /meal/portion       ← NEW: portion size selector

  /workout/log        ← NEW: log a workout
  /workout/detail/[id]← NEW: view workout
  /workout/browse     ← NEW: exercise library

  /challenge/create   ← NEW: start a challenge
  /challenge/[id]     ← NEW: challenge detail + calendar view
  /challenge/day/[id] ← NEW: daily check-in

  /pantry             ← NEW: manage pantry items
  /profile            ← NEW: body stats + goal type
```

### Tab Bar (5 tabs)

| Tab | Icon | Label |
|-----|------|-------|
| Dashboard | `home` | Today |
| Log | `clipboard-list` | History |
| + (FAB) | `plus-circle` | (capture) |
| Suggestions | `lightbulb` | Suggest |
| Chat | `message-circle` | Chat |

Settings/Profile/Pantry/Challenges accessed from Dashboard header icons or settings gear.

---

## 5. Feature: Barcode & Brand Label Scanning

### Flow

```
User taps (+) → chooses "Scan Barcode"
  → Camera opens with barcode overlay
  → expo-camera onBarcodeScanned fires
  → Call barcode-lookup edge function
  → If found: show product card with nutrition + portion selector
  → User adjusts portion (0.5x, 1x, 1.5x, 2x or custom grams)
  → Confirm → meal logged
  → If not found: offer "Search by name" or "Enter manually"
```

### Portion Size Selector

A bottom sheet with:
- **Quick picks:** 0.5x, 1x, 1.5x, 2x serving
- **Custom gram input:** numeric keyboard
- **Visual portion guide:** small / medium / large illustrations
- Real-time macro recalculation as portion changes

### Text Food Search Flow

```
User taps (+) → chooses "Search Food"
  → Text input with search icon
  → Debounced query to search-food edge function
  → Results list with nutrition previews
  → Tap → portion selector → confirm → meal logged
```

### Implementation

```typescript
// app/meal/barcode.tsx
import { CameraView } from 'expo-camera';

export default function BarcodeScanner() {
  const [scanned, setScanned] = useState(false);

  const handleBarcode = async ({ type, data }: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Call edge function
    const result = await barcodeService.lookup(data);

    if (result.found) {
      router.push({
        pathname: '/meal/portion',
        params: { product: JSON.stringify(result.product), barcode: data }
      });
    } else {
      // Show "not found" with option to search by name
      Alert.alert('Product not found', 'Search by name instead?', [
        { text: 'Search', onPress: () => router.push('/meal/search') },
        { text: 'Manual Entry', onPress: () => router.push('/meal/confirm') }
      ]);
    }
  };

  return (
    <CameraView
      barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'] }}
      onBarcodeScanned={handleBarcode}
    />
  );
}
```

---

## 6. Feature: Workout Tracking

### Data Model

Each workout log records:
- **Exercise** (from library or custom)
- **Duration** (minutes)
- **Calories burned** (auto-calculated using MET formula, overridable)

**Calorie Burn Formula:**
```
calories = MET × weight_kg × (duration_mins / 60) × 1.05
```
Falls back to `cals_per_min_default × duration_mins` if no user weight set.

### Screens

**Log Workout (`/workout/log`):**
- Exercise picker (searchable list from `exercises` table)
- Duration input (slider or numeric, 5-180 mins)
- Auto-calculated calories (shown live, editable)
- Notes field
- "Add Custom Exercise" option

**Exercise Library (`/workout/browse`):**
- Grouped by category (Cardio, Strength, Flexibility, Sports)
- Search bar
- Each row shows: name, MET value, ~cals/min

**Workout Detail (`/workout/detail/[id]`):**
- Exercise name + category tag
- Duration, calories burned
- Date, notes
- Delete button

### Dashboard Integration

The Dashboard calorie ring changes to show **net calories**:

```
Net = Consumed - Burned
Ring shows net vs goal
Below ring: "Eaten: 1,800  |  Burned: 400  |  Net: 1,400"
```

### Store: `workoutsStore.ts`

```typescript
interface WorkoutsState {
  todayWorkouts: Workout[];
  isLoading: boolean;
  error: string | null;
  fetchTodayWorkouts: () => Promise<void>;
  addWorkout: (workout: CreateWorkoutInput) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  getTodayBurned: () => number;
}
```

---

## 7. Feature: 30-Day Challenges

### Flow

```
User taps "Start Challenge" (from Dashboard or Settings)
  → Challenge creation wizard:
    1. Goal type: Cut / Bulk / Maintain / Custom
    2. Set target macros (pre-filled based on goal type + profile)
    3. Start date (default: tomorrow)
    4. Optional: start weight, target weight
  → Challenge created, 30 challenge_days rows pre-generated
  → Dashboard shows challenge banner with day count + progress

Each day during challenge:
  → challenge_day auto-populates from meals + workouts logged that day
  → User can do daily check-in:
    - Optional weigh-in
    - Notes ("felt good", "hungry all day")
    - Mark day as complete
  → Suggestions tab is contextualised to challenge goals
```

### Challenge Detail Screen (`/challenge/[id]`)

**Calendar Grid View:**
- 30-day grid (5 rows x 6 cols or scrollable row)
- Each day cell colour-coded:
  - Green: hit goals (within 10%)
  - Yellow: close (within 20%)
  - Red: missed by >20%
  - Grey: future / no data
  - Blue border: today
- Tap day → expand to see that day's breakdown

**Stats Summary:**
- Days completed: X / 30
- Average daily calories vs target
- Average daily protein vs target
- Weight trend (if weigh-ins logged): start → current → target
- Streak: consecutive days hitting goals
- Best day / worst day

### Auto-Population Logic

A Zustand action runs on app open and when meals/workouts change:

```typescript
async function syncChallengeDay(challengeId: string, date: string) {
  // Sum today's meals
  const nutrition = await mealsService.getDailyNutrition(date);
  // Sum today's workouts
  const workouts = await workoutsService.getDailyBurned(date);

  await supabase.from('challenge_days')
    .update({
      actual_calories: nutrition.total_calories,
      actual_protein_g: nutrition.total_protein_g,
      actual_carbs_g: nutrition.total_carbs_g,
      actual_fat_g: nutrition.total_fat_g,
      calories_burned: workouts.total_burned,
    })
    .eq('challenge_id', challengeId)
    .eq('day_date', date);
}
```

### Goal Type Presets

| Goal | Calories | Protein | Carbs | Fat | Notes |
|------|----------|---------|-------|-----|-------|
| Cut | TDEE - 500 | 2.0g/kg | fill | 0.8g/kg | Aggressive deficit |
| Bulk | TDEE + 300 | 1.8g/kg | fill | 1.0g/kg | Lean surplus |
| Maintain | TDEE | 1.6g/kg | fill | 0.9g/kg | Body recomp |

TDEE calculated from user profile (Mifflin-St Jeor + activity multiplier):
```
BMR (male) = 10 × weight_kg + 6.25 × height_cm - 5 × age - 161 (female) / + 5 (male)
TDEE = BMR × activity_multiplier
```

Activity multipliers: sedentary 1.2, light 1.375, moderate 1.55, active 1.725, very_active 1.9

---

## 8. Feature: AI Meal Suggestions

### Suggestions Tab (`(tabs)/suggestions.tsx`)

**Layout:**
1. **Header:** "What should I eat?" + meal type selector (lunch/dinner/snack)
2. **Remaining macros banner:** "You need 800 cal, 60g protein, 90g carbs, 25g fat"
3. **3 Suggestion Cards** (pull-to-refresh to regenerate):
   - Meal name (bold)
   - 1-line description
   - Prep time badge
   - Macro pills (cal | P | C | F)
   - "Uses: chicken, rice, broccoli" (if pantry items match)
   - Tap → expanded view with ingredients list + optional "Log this meal" button
4. **Shopping tip** at bottom (if applicable)
5. **"Regenerate" button** — get 3 new suggestions

### "Log This Meal" from Suggestion

When user taps a suggestion and confirms:
- Creates a meal entry with the suggested macros
- Meal type set to the selected type
- food_name = suggestion name
- food_items = suggestion ingredients as FoodItem array
- No photo (or placeholder icon)

### Pantry Integration

If the user has pantry items, the suggestions edge function receives them and prioritises meals using those ingredients. The suggestion cards highlight which pantry items are used.

---

## 9. Feature: AI Chat (CalorRidge Assistant)

### Chat Tab (`(tabs)/chat.tsx`)

Standard chat UI:
- Message bubbles (user right, assistant left)
- Text input with send button
- Typing indicator while waiting for response
- Messages persisted to `chat_messages` table
- Conversation history sent as context (last 20 messages)

### Context Injection

Every chat request includes structured context:

```typescript
const context = {
  todayMeals: mealsStore.todayMeals,
  goals: goalsStore.goals,
  todayNutrition: {
    consumed: sumMealsToday(mealsStore.todayMeals),
    burned: workoutsStore.getTodayBurned(),
    remaining: computeRemaining(goals, consumed, burned),
  },
  recentWorkouts: last7DaysWorkouts,
  activeChallenge: challengeStore.activeChallenge,
  challengeProgress: last7ChallengeDays,
  userProfile: profileStore.profile,
  pantryItems: pantryStore.items.map(i => i.name),
};
```

### Example Conversations

> **User:** "How am I doing today?"
> **CalorRidge:** "You've eaten 1,200 of your 2,000 calorie target with 800 remaining. Protein is looking good at 95g/150g. You burned 300 cals from your morning run. For dinner, you could hit your targets with a chicken stir-fry — about 600 cal and 45g protein. Want me to suggest something specific?"

> **User:** "How many calories in a Greggs sausage roll?"
> **CalorRidge:** *[Perplexity search triggered]* "A standard Greggs sausage roll has about 328 calories, 19g fat, 25g carbs, and 10g protein. Want me to log one?"

> **User:** "Give me a meal plan for tomorrow"
> **CalorRidge:** *[Uses goals + challenge context]* "Based on your cut challenge (1,800 cal target), here's tomorrow:
> - Breakfast: Greek yoghurt + granola + berries (380 cal, 25g P)
> - Lunch: Chicken wrap with salad (520 cal, 40g P)
> - Dinner: Salmon + sweet potato + greens (580 cal, 45g P)
> - Snack: Protein shake (320 cal, 50g P)
> Total: 1,800 cal, 160g protein."

### Structured Responses

The chat can return structured metadata alongside text:

```typescript
interface ChatMessageMetadata {
  type?: 'meal_suggestion' | 'workout_plan' | 'meal_log_prompt';
  meals?: MealSuggestion[];      // renders as tappable cards
  workout?: WorkoutSuggestion;   // renders as workout card
  logPrompt?: {                  // renders "Log this?" button
    food_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
}
```

When metadata includes `logPrompt`, the chat renders a "Log this meal" button inline that creates a meal entry directly from chat.

---

## 10. Feature: Enhanced Goal Setting

### Profile Screen (`/profile`)

- Weight (kg)
- Height (cm)
- Age
- Sex
- Activity level (5-option picker)
- Goal type (cut / bulk / maintain)
- **Auto-calculated TDEE** shown
- **"Set Goals from Profile"** button: auto-fills daily_goals from TDEE + goal type

### Updated Settings Screen

Add sections:
- **Daily Goals** (existing sliders)
- **Profile** → navigate to /profile
- **Challenge** → navigate to /challenge/create or active challenge
- **Pantry** → navigate to /pantry
- **API Keys** (for self-hosted: toggle between cloud/local)

---

## 11. Feature: Ingredient Pantry

### Pantry Screen (`/pantry`)

- List of pantry items grouped by category
- Each item: name, quantity, category tag, expiry (if set)
- Swipe to delete
- "Add Item" button → modal with:
  - Name (text input)
  - Category (picker: protein/carb/fat/dairy/vegetable/fruit/grain/spice/sauce/other)
  - Quantity (freeform text)
  - Is staple? (toggle — staples never "run out")
  - Expiry date (optional date picker)
- **Quick add:** type name, auto-categorise with simple keyword matching
- Pantry items feed into meal suggestions

### Store: `pantryStore.ts`

```typescript
interface PantryState {
  items: PantryItem[];
  isLoading: boolean;
  fetchItems: () => Promise<void>;
  addItem: (item: CreatePantryInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  getItemNames: () => string[];
}
```

---

## 12. New Packages

```json
{
  "dependencies": {
    "expo-barcode-scanner": "^13.0.1",
    "react-native-gifted-chat": "^2.6.4"
  }
}
```

**Note:** `expo-camera` already supports barcode scanning via `onBarcodeScanned` — no extra package needed if using CameraView. Only add `expo-barcode-scanner` if we want the dedicated scanner component for a cleaner UX. Otherwise, reuse `expo-camera` which is already installed.

For chat UI, `react-native-gifted-chat` gives us message bubbles, typing indicators, and input bar out of the box. Alternatively, we build a lightweight custom chat UI to avoid the dependency (the app's dark theme may clash with gifted-chat defaults).

**Recommended approach:** Build custom chat UI (lighter, matches existing theme, avoids gifted-chat quirks on RN 0.81). It's just a FlatList + TextInput + message bubble components.

---

## 13. API Keys & Secrets

### Supabase Secrets (Edge Functions)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set PERPLEXITY_API_KEY=pplx-...
```

### Models Used

| Function | Model | Cost/call (est) |
|----------|-------|-----------------|
| analyze-meal | claude-haiku-4-5 | ~$0.001 |
| suggest-meals | claude-sonnet-4-6 | ~$0.005 |
| chat | claude-sonnet-4-6 | ~$0.003-0.01 |
| barcode-lookup | OpenFoodFacts (free) + Perplexity fallback | ~$0.002 |
| search-food | Perplexity + Claude Haiku | ~$0.003 |

### Perplexity API

- Model: `sonar` (latest, fast, cheap)
- Used for: real-time food/nutrition search, barcode fallback, chat knowledge augmentation
- Endpoint: `https://api.perplexity.ai/chat/completions`
- Cost: ~$0.001-0.003 per query

---

## 14. Migration Strategy

Migrations must be run in order. Each is additive (no destructive changes to existing tables).

```bash
# From project root
cd supabase

# Run new migrations
supabase db push

# Or manually in Supabase SQL editor:
# 1. Run 003_workouts.sql
# 2. Run 004_challenges.sql
# 3. Run 005_chat_and_pantry.sql

# Deploy new edge functions
supabase functions deploy suggest-meals --no-verify-jwt
supabase functions deploy chat --no-verify-jwt
supabase functions deploy barcode-lookup --no-verify-jwt
supabase functions deploy search-food --no-verify-jwt

# Set new secrets
supabase secrets set PERPLEXITY_API_KEY=pplx-...
```

---

## 15. Implementation Order

Build in phases. Each phase is independently shippable.

### Phase 1: Foundation (Profile + Enhanced Goals + Workouts)
**Why first:** Workouts affect calorie balance, profile enables TDEE calculation. Everything else builds on these.

1. `005_chat_and_pantry.sql` → run migration (gets `user_profile` table)
2. Build `/profile` screen + `profileStore`
3. TDEE auto-calculation in goal settings
4. `003_workouts.sql` → run migration
5. Build exercise library browser
6. Build workout log screen
7. Build `workoutsStore`
8. Update Dashboard: net calories display, workout summary section
9. Update Log screen: show workouts in timeline alongside meals

### Phase 2: Barcode Scanning + Food Search
**Why second:** New food entry methods. High daily-use impact.

1. Build `barcode-lookup` edge function
2. Build `search-food` edge function
3. `barcode_cache` table (part of migration 005)
4. Build `/meal/barcode` scanner screen
5. Build `/meal/search` text search screen
6. Build `/meal/portion` portion selector
7. Update (+) FAB to show options: Photo | Barcode | Search | Manual

### Phase 3: 30-Day Challenges
**Why third:** Needs workouts + goals to be meaningful.

1. `004_challenges.sql` → run migration
2. Build `challengeStore`
3. Build `/challenge/create` wizard
4. Build `/challenge/[id]` detail with calendar grid
5. Build `/challenge/day/[id]` daily check-in
6. Auto-sync challenge days from meals + workouts
7. Dashboard challenge banner + progress ring

### Phase 4: AI Suggestions
**Why fourth:** Needs meals, goals, and ideally pantry to give good suggestions.

1. Build `suggest-meals` edge function
2. Build Suggestions tab
3. Build suggestion cards with "Log this meal" action
4. Pantry integration (build pantry screen + store in parallel)
5. Shopping tip display

### Phase 5: AI Chat
**Why last:** Most complex, benefits from all other features being in place for rich context.

1. Build `chat` edge function (Claude + Perplexity integration)
2. Chat message persistence (conversations + messages tables)
3. Build Chat tab with custom chat UI
4. Context injection (today's meals, workouts, challenge, profile, pantry)
5. Structured response rendering (meal cards, log buttons in chat)
6. Perplexity search detection + integration

---

## 16. Mobile Optimisation Notes

### Performance
- **Lazy load tabs:** Suggestions and Chat tabs don't fetch until first visited
- **Pagination everywhere:** Meals (existing), workouts, chat messages — all paginated
- **Image compression:** Already implemented (adaptive 500KB limit) — reuse for any new photo features
- **Debounce search:** Food search input debounced at 500ms
- **Memoise expensive computations:** TDEE, daily totals, challenge stats wrapped in `useMemo`
- **Optimistic updates:** Already in place for meals/goals — extend to workouts, pantry, challenges

### UX
- **Haptic feedback:** On barcode scan, workout log, challenge check-in (already used in capture)
- **Pull-to-refresh:** On all list screens (already on dashboard/log)
- **Skeleton loaders:** For suggestions and chat while AI processes
- **Offline resilience:** Zustand persist for goals (existing) + extend to profile, pantry (staples)
- **Bottom sheet modals:** For portion selector, exercise picker, quick-add pantry — feels native on mobile
- **Large touch targets:** All buttons minimum 44x44pt, FAB 56x56pt
- **Keyboard avoidance:** Chat input stays above keyboard (KeyboardAvoidingView)

### Navigation
- **Gesture navigation:** Already using react-native-screens with slide animations
- **Tab bar:** Keep to 5 tabs max (Dashboard, Log, +, Suggest, Chat)
- **Settings/Profile/Pantry:** Accessible from Dashboard header, not tabs (avoids crowding)
- **Deep linking:** Challenge notifications could deep link to challenge day (future)

### Battery & Data
- **No polling:** All data fetched on-demand or on screen focus
- **Cache barcode lookups:** Prevents repeated API calls for same products
- **Chat context trimmed:** Only send last 20 messages + today's data (not full history)
- **Image analysis cache:** Already 7-day TTL on food_cache

---

## 17. Cost Estimate (Monthly, Active Use)

Assuming daily use: 4 meal scans, 1 barcode scan, 2 workout logs, 1 suggestion refresh, 5 chat messages.

| Service | Monthly Cost |
|---------|-------------|
| Claude Haiku (meal analysis, 120/mo) | ~$0.12 |
| Claude Sonnet (suggestions, 30/mo) | ~$0.15 |
| Claude Sonnet (chat, 150 msgs/mo) | ~$1.50 |
| Perplexity (search/chat fallback, 30/mo) | ~$0.06 |
| Open Food Facts API | Free |
| Supabase (free tier) | $0 |
| **Total** | **~$1.80/month** |

---

## File Structure (New/Modified)

```
calorridge/
├── app/
│   ├── (tabs)/
│   │   ├── dashboard.tsx      ← MODIFY: add workout summary, challenge banner, net cals
│   │   ├── log.tsx            ← MODIFY: add workout entries to timeline
│   │   ├── suggestions.tsx    ← NEW
│   │   ├── chat.tsx           ← NEW
│   │   ├── settings.tsx       ← MODIFY: add profile/challenge/pantry links
│   │   └── _layout.tsx        ← MODIFY: 5 tabs
│   ├── meal/
│   │   ├── barcode.tsx        ← NEW
│   │   ├── search.tsx         ← NEW
│   │   ├── portion.tsx        ← NEW
│   │   ├── capture.tsx        ← existing
│   │   ├── confirm.tsx        ← existing
│   │   └── detail/[id].tsx    ← existing
│   ├── workout/
│   │   ├── log.tsx            ← NEW
│   │   ├── detail/[id].tsx    ← NEW
│   │   └── browse.tsx         ← NEW
│   ├── challenge/
│   │   ├── create.tsx         ← NEW
│   │   ├── [id].tsx           ← NEW
│   │   └── day/[id].tsx       ← NEW
│   ├── pantry.tsx             ← NEW
│   ├── profile.tsx            ← NEW
│   ├── _layout.tsx            ← existing
│   └── index.tsx              ← existing
├── components/
│   ├── dashboard/
│   │   ├── CalorieRing.tsx    ← MODIFY: show net calories
│   │   ├── MacroBar.tsx       ← existing
│   │   ├── WorkoutSummary.tsx ← NEW
│   │   └── ChallengeBanner.tsx← NEW
│   ├── meal/                  ← existing
│   ├── workout/
│   │   ├── ExercisePicker.tsx ← NEW
│   │   └── WorkoutCard.tsx    ← NEW
│   ├── challenge/
│   │   ├── CalendarGrid.tsx   ← NEW
│   │   ├── DayCell.tsx        ← NEW
│   │   └── ProgressStats.tsx  ← NEW
│   ├── chat/
│   │   ├── MessageBubble.tsx  ← NEW
│   │   ├── ChatInput.tsx      ← NEW
│   │   ├── TypingIndicator.tsx← NEW
│   │   └── MealCard.tsx       ← NEW (inline suggestion card)
│   ├── suggestions/
│   │   └── SuggestionCard.tsx ← NEW
│   ├── pantry/
│   │   ├── PantryItem.tsx     ← NEW
│   │   └── AddItemSheet.tsx   ← NEW
│   ├── barcode/
│   │   ├── ScanOverlay.tsx    ← NEW
│   │   └── ProductCard.tsx    ← NEW
│   └── shared/                ← existing
├── services/
│   ├── mealsService.ts        ← existing
│   ├── goalsService.ts        ← existing
│   ├── analysisService.ts     ← existing
│   ├── storageService.ts      ← existing
│   ├── workoutsService.ts     ← NEW
│   ├── challengeService.ts    ← NEW
│   ├── chatService.ts         ← NEW
│   ├── barcodeService.ts      ← NEW
│   ├── searchService.ts       ← NEW
│   ├── pantryService.ts       ← NEW
│   └── profileService.ts      ← NEW
├── store/
│   ├── mealsStore.ts          ← existing
│   ├── goalsStore.ts          ← existing
│   ├── workoutsStore.ts       ← NEW
│   ├── challengeStore.ts      ← NEW
│   ├── chatStore.ts           ← NEW
│   ├── pantryStore.ts         ← NEW
│   └── profileStore.ts        ← NEW
├── hooks/
│   ├── useMealAnalysis.ts     ← existing
│   ├── useMealHistory.ts      ← existing
│   ├── useDailyStats.ts       ← MODIFY: include workout burn
│   ├── useCamera.ts           ← existing
│   ├── useWorkouts.ts         ← NEW
│   ├── useChallenge.ts        ← NEW
│   ├── useChat.ts             ← NEW
│   └── useBarcodeScanner.ts   ← NEW
├── types/
│   ├── meal.ts                ← existing
│   ├── analysis.ts            ← existing
│   ├── goals.ts               ← existing
│   ├── supabase.ts            ← MODIFY: add new table types
│   ├── workout.ts             ← NEW
│   ├── challenge.ts           ← NEW
│   ├── chat.ts                ← NEW
│   ├── pantry.ts              ← NEW
│   ├── profile.ts             ← NEW
│   └── barcode.ts             ← NEW
├── utils/
│   ├── imageUtils.ts          ← existing
│   ├── macroUtils.ts          ← MODIFY: add net calorie helpers
│   ├── tdeeUtils.ts           ← NEW (BMR + TDEE calculation)
│   └── dateUtils.ts           ← NEW (challenge date helpers)
├── constants/
│   ├── theme.ts               ← MODIFY: add new colours for workouts/challenges
│   ├── macros.ts              ← existing
│   ├── mealTypes.ts           ← existing
│   ├── exercises.ts           ← NEW (category configs, icons)
│   └── challenges.ts          ← NEW (goal type presets)
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql     ← existing
│   │   ├── 002_storage_policies.sql   ← existing
│   │   ├── 003_workouts.sql           ← NEW
│   │   ├── 004_challenges.sql         ← NEW
│   │   └── 005_chat_and_pantry.sql    ← NEW
│   └── functions/
│       ├── analyze-meal/              ← existing
│       ├── suggest-meals/             ← NEW
│       │   ├── index.ts
│       │   └── prompt.ts
│       ├── chat/                      ← NEW
│       │   ├── index.ts
│       │   ├── prompt.ts
│       │   └── perplexity.ts
│       ├── barcode-lookup/            ← NEW
│       │   └── index.ts
│       └── search-food/               ← NEW
│           └── index.ts
└── TECHNICAL_PLAN.md                  ← this file
```

---

## Summary

CalorRidge v2 transforms from a meal-photo calorie tracker into a complete AI-powered health companion:

- **5 food entry methods:** Photo scan, barcode scan, text search, manual entry, chat-based logging
- **Workout tracking** with MET-based calorie burn and 23 pre-loaded exercises
- **30-day challenges** with daily check-ins, calendar visualisation, and progress stats
- **AI meal suggestions** that account for remaining macros, pantry items, and preferences
- **AI chat assistant** with full context awareness (meals, workouts, challenges, profile, pantry)
- **Perplexity integration** for real-time nutrition facts and branded product lookups
- **TDEE-based goal setting** from user profile with cut/bulk/maintain presets

All built on the existing Expo + Supabase + Zustand stack with no architectural rewrites needed.
