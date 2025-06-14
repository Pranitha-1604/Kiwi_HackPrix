-- KIWI Database Schema for Supabase

-- Users table (optional, can use Supabase Auth)
-- This is just a reference if you want to extend the user model
-- CREATE TABLE users (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   email TEXT UNIQUE NOT NULL,
--   name TEXT,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Branches table - represents conversation branches
CREATE TABLE branches (
  id UUID PRIMARY KEY,
  parent_id UUID REFERENCES branches(id),
  user_id UUID NOT NULL,
  fork_point_message_id UUID,
  is_merge BOOLEAN DEFAULT FALSE,
  merge_source_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages table - stores conversation messages
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  llm_type TEXT,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_bookmarked BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}',
  original_message_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Todos table - stores to-do items
CREATE TABLE todos (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  user_id UUID NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocks table - stores Notion-like blocks
CREATE TABLE blocks (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('text', 'code', 'image', 'heading', 'list', 'quote', 'divider')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  user_id UUID NOT NULL,
  position INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Memory table - stores shared memory items
CREATE TABLE memory (
  id UUID PRIMARY KEY,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('quote', 'link', 'insight', 'reference', 'note')),
  content TEXT NOT NULL,
  source TEXT,
  user_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insights table - stores AI-generated branch summaries
CREATE TABLE insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE UNIQUE,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_messages_branch_id ON messages(branch_id);
CREATE INDEX idx_todos_branch_id ON todos(branch_id);
CREATE INDEX idx_blocks_branch_id ON blocks(branch_id);
CREATE INDEX idx_memory_branch_id ON memory(branch_id);
CREATE INDEX idx_branches_parent_id ON branches(parent_id);
CREATE INDEX idx_branches_user_id ON branches(user_id);

-- Row Level Security Policies (optional)
-- These are just examples, adjust according to your authentication setup

-- Enable RLS
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Example: Allow users to see only their own branches
-- CREATE POLICY "Users can view their own branches" ON branches
--   FOR SELECT USING (user_id = auth.uid());

-- Example: Allow users to insert their own branches
-- CREATE POLICY "Users can insert their own branches" ON branches
--   FOR INSERT WITH CHECK (user_id = auth.uid());

-- Example: Allow users to update their own branches
-- CREATE POLICY "Users can update their own branches" ON branches
--   FOR UPDATE USING (user_id = auth.uid());

-- Example: Allow users to delete their own branches
-- CREATE POLICY "Users can delete their own branches" ON branches
--   FOR DELETE USING (user_id = auth.uid());