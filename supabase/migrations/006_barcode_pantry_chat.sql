-- ============================================================
-- BARCODE CACHE
-- ============================================================
CREATE TABLE barcode_cache (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barcode             TEXT NOT NULL UNIQUE,
  product_name        TEXT,
  brand               TEXT,
  nutrition_per_100g  JSONB,
  serving_size        TEXT,
  source              TEXT NOT NULL DEFAULT 'openfoodfacts',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_barcode_cache ON barcode_cache(barcode);

-- ============================================================
-- PANTRY ITEMS
-- ============================================================
CREATE TABLE pantry_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  category    TEXT CHECK (category IN (
    'protein', 'carb', 'fat', 'dairy', 'vegetable',
    'fruit', 'grain', 'spice', 'sauce', 'other'
  )),
  quantity    TEXT,
  is_staple   BOOLEAN DEFAULT false,
  expires_at  DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER pantry_items_updated_at
  BEFORE UPDATE ON pantry_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- CHAT CONVERSATIONS & MESSAGES
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
  metadata          JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_convo ON chat_messages(conversation_id, created_at);

CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON chat_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE barcode_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to barcode_cache"
  ON barcode_cache FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to pantry_items"
  ON pantry_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to chat_conversations"
  ON chat_conversations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access to chat_messages"
  ON chat_messages FOR ALL TO anon USING (true) WITH CHECK (true);
