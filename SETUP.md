# CalorRidge — Setup Guide

## Prerequisites
- Node.js 18+ & npm
- Expo CLI: `npm install -g expo-cli`
- Supabase CLI: `brew install supabase/tap/supabase`
- EAS CLI (optional, for builds): `npm install -g eas-cli`

---

## 1. Supabase Project Setup

### 1a. Create a new Supabase project
1. Go to https://supabase.com → New project
2. Note your **Project URL** and **anon public key** (Settings → API)

### 1b. Run the database migrations
In the Supabase SQL Editor, run the contents of:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_storage_policies.sql`

Or using the CLI:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### 1c. Create the storage bucket
The migration creates the bucket automatically. Verify it exists at Storage → meal-photos in the Supabase Dashboard.

---

## 2. Environment Setup

Copy `.env.example` to `.env` and fill in your values:
```bash
cp .env.example .env
```

Edit `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

---

## 3. Deploy the Edge Function

### 3a. Set the Anthropic API key as a secret
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3b. Deploy the function
```bash
supabase functions deploy analyze-meal --no-verify-jwt
```

### 3c. Verify the deployment
```bash
# Test with a real base64 image (replace IMAGE_BASE64 with actual data)
curl -X POST 'https://your-project.supabase.co/functions/v1/analyze-meal' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "imageBase64": "BASE64_IMAGE_DATA",
    "imageMediaType": "image/jpeg",
    "imageHash": "test-hash-001",
    "portionNotes": "Medium portion, about 300g"
  }'
```

---

## 4. Run the App

```bash
npm install
npx expo start
```

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app for physical device

---

## 5. EAS Build (for real device installation)

```bash
# Configure EAS
eas login
eas build:configure

# Build for iOS (TestFlight)
eas build --platform ios --profile preview

# Build for Android (APK)
eas build --platform android --profile preview
```

---

## Architecture Notes

### Data Flow
```
Photo → Compress (≤500KB) → SHA-256 hash
       ↓
[PARALLEL]
  Upload to Supabase Storage → photo_url
  POST to Edge Function → Claude Haiku → JSON macros
       ↓
Confirm screen (edit if needed) → Save to meals table
       ↓
Zustand optimistic update → Dashboard re-renders
```

### Cost Estimate
- Claude Haiku: ~$0.001/scan × 4/day × 365 = **~$1.20/year**
- Supabase free tier: **$0**
- EAS personal: **$0**
- **Total: ~$1–2/year**

### Edge Function Cache
Identical images (same SHA-256) are served from `food_cache` table for 7 days,
avoiding redundant Claude API calls.
