
import { supabase } from '../supabase';
import { ChatMessage } from '../types';

export const createOrGetChatSession = async (userId: string, language: string = 'he') => {
  // Try to find an active session first
  const { data: existing, error: findError } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing && !findError) return existing;

  const { data, error } = await supabase
    .from('chat_sessions')
    .insert({
      user_id: userId,
      language,
      messages: []
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateChatSessionMessages = async (sessionId: string, messages: ChatMessage[]) => {
  const { error } = await supabase
    .from('chat_sessions')
    .update({ messages })
    .eq('id', sessionId);

  if (error) throw error;
};
