
import { createClient } from 'https://esm.sh/@supabase/supabase-js@^2.45.0';

// Note: These would ideally come from environment variables. 
// Assuming the user has configured their project settings.
const supabaseUrl = (window as any).process?.env?.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = (window as any).process?.env?.SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Tables = {
  profiles: {
    id: string;
    full_name: string | null;
    phone: string | null;
    email: string | null;
    preferred_language: string;
    created_at: string;
  };
  legal_cases: {
    id: string;
    user_id: string;
    status: 'new' | 'analyzed' | 'referred';
    urgency_level: 'low' | 'high';
    case_type: string | null;
    raw_description: string | null;
    ai_summary_json: any;
    document_url: string | null;
    created_at: string;
  };
  chat_sessions: {
    id: string;
    user_id: string;
    case_id: string | null;
    messages: any[];
    language: string;
    created_at: string;
  };
};
