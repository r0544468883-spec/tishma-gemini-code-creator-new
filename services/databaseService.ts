
import { supabase } from '../supabase';
import { LegalAnalysis, UrgencyLevel } from '../types';

export const saveLegalCase = async (
  userId: string,
  description: string,
  analysis: LegalAnalysis,
  documentUrl?: string
) => {
  const urgencyMap: Record<UrgencyLevel, 'low' | 'high'> = {
    [UrgencyLevel.LOW]: 'low',
    [UrgencyLevel.MEDIUM]: 'low',
    [UrgencyLevel.HIGH]: 'high',
    [UrgencyLevel.CRITICAL]: 'high',
  };

  const { data, error } = await supabase
    .from('legal_cases')
    .insert({
      user_id: userId,
      status: 'analyzed',
      urgency_level: urgencyMap[analysis.urgency],
      case_type: 'Legal Document', // Could be more specific based on AI output
      raw_description: description,
      ai_summary_json: analysis,
      document_url: documentUrl
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const uploadDocument = async (userId: string, file: File) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}/${Math.random()}.${fileExt}`;
  const filePath = `case_documents/${fileName}`;

  const { data, error } = await supabase.storage
    .from('case_documents')
    .upload(fileName, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('case_documents')
    .getPublicUrl(fileName);

  return publicUrl;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
};
