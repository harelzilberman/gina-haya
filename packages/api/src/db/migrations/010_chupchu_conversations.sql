-- Create chupchu_conversations table for Chupchu memory
CREATE TABLE IF NOT EXISTS chupchu_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garden_id UUID REFERENCES gardens(id) ON DELETE SET NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_chupchu_conversations_user_id
  ON chupchu_conversations(user_id);

-- RLS
ALTER TABLE chupchu_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own conversations"
  ON chupchu_conversations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also create chupchu_memory table if it doesn't exist
CREATE TABLE IF NOT EXISTS chupchu_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_he TEXT,
  summary_en TEXT,
  garden_facts JSONB,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE chupchu_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own memory"
  ON chupchu_memory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role bypass for backend writes
CREATE POLICY "Service role can manage all conversations"
  ON chupchu_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all memory"
  ON chupchu_memory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
