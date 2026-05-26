export interface User {
  userId: string;
  email: string;
  role: 'citizen' | 'advocate' | 'admin';
}

export interface Classification {
  matterType: string;
  statute?: string | null;
  primaryDomain?: string;
  userQuestion: string;
  involvesPolice: boolean;
  incidentDate?: string | null;
  location?: string | { state: string; district: string | null } | null;
  applicableLaws?: { act: string; sections: string[]; confidence: string }[];
}

export interface Citation {
  title: string;
  section?: string;
  url?: string;
  type: 'statute' | 'judgment' | 'rule';
}

// Frontend display type (used by mock data and UI components)
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

// Backend API response for GET /api/matter/:id and POST /api/matter
export interface BackendCitation {
  source: string;
  section: string;
  title: string;
  text: string;
  citation: string;
}

export interface BackendMatterResponse {
  matterId: string;
  status: string;
  query: string;
  language: 'en' | 'bn';
  createdAt: string;
  aiResponse: {
    classification: Classification | null;
    citations: BackendCitation[];
    responseEnglish: string | null;
    responseBengali: string | null;
    procedural: string | null;
    nextSteps: string | null;
    disclaimer: string;
  } | null;
}

// Backend API response for GET /api/matter/:id/advocates
export interface BackendAdvocatesResponse {
  advocates: Advocate[];
  total: number;
  page: number;
  pages: number;
}

// Backend API response for POST /api/consultations
export interface BackendConsultationResponse {
  consultationId: string;
  status: 'pending' | 'accepted' | 'declined' | 'closed';
  matterId: string;
  advocateId: string;
  createdAt: string;
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

// Citizen-side consultation (from POST /api/consultations and GET /api/consultations/:id)
export interface Consultation {
  consultationId: string;
  id?: string; // alias for compatibility
  matterId: string;
  citizenId?: string;
  advocateId: string;
  status: 'pending' | 'accepted' | 'declined' | 'closed';
  requestedAt?: string;
  createdAt?: string;
  acceptedAt?: string;
}

// Advocate-side consultation (from GET /api/advocate/consultations)
export interface AdvocateConsultation {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'closed';
  requested_at: string;
  accepted_at?: string;
  query_text: string;
  query_language: 'en' | 'bn';
  classification: Classification;
  citations?: Citation[];
  ai_response_english?: string;
  ai_response_bengali?: string;
  citizen_user_id: string;
  matter_id?: string;
  citizen_note?: string;
  advocate_note?: string;
}

// WebSocket message from backend
export interface WsMessage {
  messageId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  text: string;
  moderationStatus: 'cleared' | 'flagged' | 'pending';
  timestamp: string;
}

// Local chat message (display type)
export interface Message {
  id: string;
  consultationId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  content: string;
  moderationStatus: 'approved' | 'cleared' | 'pending' | 'flagged';
  createdAt: string;
}

// Cached matter stub for /matters page (stored in localStorage)
export interface MatterStub {
  id: string;
  queryText: string;
  matterType?: string;
  status: string;
  createdAt: string;
}
