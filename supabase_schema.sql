
-- 1. Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  preferred_language TEXT DEFAULT 'he',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Legal Cases table
CREATE TYPE case_status AS ENUM ('new', 'analyzed', 'referred');
CREATE TYPE urgency_type AS ENUM ('low', 'high');

CREATE TABLE IF NOT EXISTS public.legal_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status case_status DEFAULT 'new',
  urgency_level urgency_type DEFAULT 'low',
  case_type TEXT,
  raw_description TEXT,
  ai_summary_json JSONB,
  document_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Chat Sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  case_id UUID REFERENCES public.legal_cases(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'he',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Storage Bucket
-- Run this in the Supabase UI or via API to create the bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('case_documents', 'case_documents', false);

-- 5. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Users can view own profile" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Policies for Legal Cases
CREATE POLICY "Users can view own cases" ON public.legal_cases 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cases" ON public.legal_cases 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cases" ON public.legal_cases 
  FOR UPDATE USING (auth.uid() = user_id);

-- Policies for Chat Sessions
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat sessions" ON public.chat_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Storage Policies (simplified)
-- Policy to allow authenticated users to upload to their own folder in case_documents
-- (Assuming folders are named by user_id)
