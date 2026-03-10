export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface EventPayload {
  title: string;
  description?: string;
  eventDate?: string;
  endDate?: string;
  location?: string;
  imageUrl?: string;
  customFormSchema?: EventFeedbackFormSchema | null;
}

export interface EventItem {
  id: number;
  title: string;
  description: string;
  event_date: string;
  end_date?: string;
  location: string;
  image_url?: string;
  feedback_count?: number;
  is_expired?: boolean;
  event_code: string;
  feedback_form_schema?: EventFeedbackFormSchema | null;
  created_at: string;
}

export interface EventMaterial {
  id: number;
  event_id: number;
  uploader_type: 'admin' | 'user';
  uploader_id?: number;
  original_name: string;
  filename: string;
  mime_type: string;
  category: 'presentation' | 'video' | 'audio' | 'document' | 'other';
  file_url: string;
  created_at: string;
}

export interface EventMaterialsResponse {
  event: {
    id: number;
    title?: string;
    event_code: string;
  };
  materials: EventMaterial[];
}

export interface EventFeedbackQuestion {
  id: string;
  label: string;
  type: 'text' | 'radio' | 'checkbox';
  required?: boolean;
  options?: string[];
}

export interface EventFeedbackFormSchema {
  version: number;
  questions: EventFeedbackQuestion[];
}

export interface FeedbackPayload {
  eventCode: string;
  rating?: number;
  satisfaction?: string;
  comment?: string;
  name?: string;
  email?: string;
  customAnswers?: Record<string, string | string[]>;
}

export interface FeedbackItem {
  id: number;
  event_id: number;
  rating: number;
  satisfaction: string;
  comment: string;
  name?: string;
  email?: string;
  custom_answers?: Record<string, string | string[]>;
  created_at: string;
}

export interface DonationPayload {
  eventCode?: string;
  amount: number;
  name?: string;
  email?: string;
  note?: string;
}

export interface UserRegisterPayload {
  name: string;
  email: string;
  password: string;
  organization?: string;
}

export interface UserLoginPayload {
  email: string;
  password: string;
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  organization?: string;
  role: 'user' | 'admin';
  profile_image_url?: string;
}

export interface UserPayment {
  id: number;
  payment_type: 'subscription' | 'donation';
  amount: number;
  status: string;
  note?: string;
  created_at: string;
}

export interface UserFeedbackHistoryItem {
  id: number;
  event_id: number;
  event_title: string;
  event_code: string;
  rating: number;
  satisfaction: string;
  comment: string;
  name?: string;
  email?: string;
  custom_answers?: Record<string, string | string[]>;
  created_at: string;
}

export interface ChatbotKnowledgeEntry {
  id: number;
  title: string;
  keywords: string;
  answer_en: string;
  answer_sw?: string | null;
  is_active: boolean;
  created_by_admin?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ChatbotAskResponse {
  answer: string;
  matched: boolean;
  entryId?: number;
  title?: string;
}
