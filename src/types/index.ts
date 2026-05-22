export interface User {
  userId: string;
  email: string;
  role: 'citizen' | 'advocate' | 'admin';
}

export interface Classification {
  matterType: string;
  statute: string;
  userQuestion: string;
  involvesPolice: boolean;
  incidentDate?: string;
  location?: string;
}

export interface Citation {
  title: string;
  section?: string;
  url?: string;
  type: 'statute' | 'judgment' | 'rule';
}

export interface Matter {
  id: string;
  queryText: string;
  queryLanguage: 'en' | 'bn';
  classification: Classification;
  citations: Citation[];
  aiResponseEnglish: string;
  aiResponseBengali: string;
  disclaimer: string;
  status: 'session-owned' | 'user-owned' | 'archived';
  createdAt: string;
  expiresAt?: string;
  userId?: string;
}

export interface Advocate {
  id?: string;
  advocate_id?: string;
  userId?: string;
  user_id?: string;
  name: string;
  address: string;
  phone: string;
  email?: string;
  advocate_email?: string;
  barEnrolmentNumber?: string;
  bar_enrolment_number?: string;
  stateBar?: string;
  state_bar?: string;
  practiceAreas?: string[];
  practice_areas?: string[];
  courts: string[];
  languages: string[];
  districts: string[];
  verificationStatus?: 'pending' | 'verified' | 'rejected';
  verification_status?: 'pending' | 'verified' | 'rejected';
  user_email?: string;
  auth_email?: string;
  preferred_language?: string;
  avatar_url?: string;
}

export interface Consultation {
  id: string;
  matterId: string;
  citizenId: string;
  advocateId: string;
  status: 'requested' | 'accepted' | 'declined' | 'closed';
  requestedAt: string;
  acceptedAt?: string;
}

export interface AdvocateConsultation {
  id: string;
  status: 'requested' | 'accepted' | 'declined' | 'closed';
  requested_at: string;
  accepted_at?: string;
  query_text: string;
  query_language: 'en' | 'bn';
  classification: Classification;
  citations?: Citation[];
  ai_response_english?: string;
  ai_response_bengali?: string;
  citizen_user_id: string;
}

export interface Message {
  id: string;
  consultationId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  content: string;
  moderationStatus: 'approved' | 'pending' | 'flagged';
  createdAt: string;
}