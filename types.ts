
export enum UrgencyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface LegalAction {
  title: string;
  description: string;
  deadline?: string;
}

export interface LegalAnalysis {
  summary: string;
  simplifiedHebrew: string;
  urgency: UrgencyLevel;
  keyDates: string[];
  recommendedActions: LegalAction[];
  legalTermsExplained: { term: string; explanation: string }[];
}

export interface AnalysisState {
  isLoading: boolean;
  result: LegalAnalysis | null;
  error: string | null;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  quickReplies?: string[];
  groundingUrls?: { title: string; uri: string }[];
}

export interface UserProfile {
  id: string;
  full_name: string;
  phone: string;
  email: string;
  preferred_language: string;
}

export interface CaseFormData {
  fullName: string;
  email: string;
  phone: string;
  legalField: string;
  hasDeadline: boolean;
  deadlineDate?: string;
  narrative: string;
  filePreview: string | null;
  selectedFile: File | null;
  generatedVideoUrl?: string;
}
