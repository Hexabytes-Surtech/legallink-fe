// ============================================================================
// LegalLink — Shared Types
// All types here mirror the backend response shapes exactly.
// Backend base URL: http://localhost:4000/api
// ============================================================================

// ---------------------------------------------------------------------------
// Auth & User
// ---------------------------------------------------------------------------

export type Role = 'citizen' | 'advocate' | 'admin';

export interface User {
  userId: string;
  email: string;
  role: Role;
  name?: string;
  avatar_url?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

// ---------------------------------------------------------------------------
// Matter classification (backend AI response)
// ---------------------------------------------------------------------------

export interface ApplicableLaw {
  act: string;
  sections: string[];
  confidence: string;
}

export interface ClassificationLocation {
  state: string | null;
  district: string | null;
}

export interface Classification {
  matterType: string;
  statute?: string | null;
  primaryDomain?: string;
  userQuestion: string;
  involvesPolice: boolean;
  incidentDate?: string | null;
  // Backend may return either a string or an object — handle both at the UI layer
  location?: string | ClassificationLocation | null;
  applicableLaws?: ApplicableLaw[];
}

// ---------------------------------------------------------------------------
// Citation (backend AI response — flat shape)
// ---------------------------------------------------------------------------

export interface BackendCitation {
  source: string;
  section: string;
  title: string;
  text: string;
  citation: string;
  // Optional display hints — some mock/legacy callers attach these; backend does not.
  url?: string;
  type?: 'statute' | 'judgment' | 'rule';
}

// Legacy frontend citation shape (kept for mock data only)
export interface Citation {
  title: string;
  section?: string;
  url?: string;
  type: 'statute' | 'judgment' | 'rule';
}

// ---------------------------------------------------------------------------
// Matter (backend response)
// POST /api/matter and GET /api/matter/:id
// ---------------------------------------------------------------------------

export interface BackendAiResponse {
  classification: Classification | null;
  citations: BackendCitation[];
  responseEnglish: string | null;
  responseBengali: string | null;
  procedural: string | null;
  nextSteps: string | null;
  disclaimer: string;
}

export interface BackendMatterResponse {
  matterId: string;
  status: string;
  query: string;
  language: 'en' | 'bn';
  createdAt: string;
  aiResponse: BackendAiResponse | null;
}

// GET /api/matter (list for logged-in citizen)
// Backend returns a lightweight list row per matter
export interface BackendMatterListItem {
  matterId: string;
  query: string;
  language: 'en' | 'bn';
  status: string;
  matterType?: string | null;
  createdAt: string;
  consultationId?: string | null;
  consultationStatus?: 'pending' | 'accepted' | 'declined' | 'closed' | null;
  advocateName?: string | null;
  scheduledAt?: string | null;
}

// Localstorage stub used to render /matters before/when backend list is unavailable
export interface MatterStub {
  id: string;
  queryText: string;
  matterType?: string;
  status: string;
  createdAt: string;
  consultationId?: string;
  consultationStatus?: 'pending' | 'accepted' | 'declined' | 'closed';
  advocateName?: string;
  scheduledAt?: string;
}

// Frontend display type (used by mock data)
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

// ---------------------------------------------------------------------------
// Advocate
// GET /api/advocate/me, GET /advocates/:id, GET /api/matter/:id/advocates
// Backend uses snake_case; some legacy endpoints camelCase — accept both.
// ---------------------------------------------------------------------------

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Advocate {
  id?: string;
  advocate_id?: string;
  userId?: string;
  user_id?: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  advocate_email?: string;
  user_email?: string;
  auth_email?: string;
  barEnrolmentNumber?: string;
  bar_enrolment_number?: string;
  stateBar?: string;
  state_bar?: string;
  yearOfEnrolment?: number;
  year_of_enrolment?: number;
  practiceAreas?: string[];
  practice_areas?: string[];
  courts: string[];
  languages: string[];
  districts: string[];
  bio?: string;
  availability_mode?: 'online' | 'in_person' | 'both';
  availabilityMode?: 'online' | 'in_person' | 'both';
  verificationStatus?: VerificationStatus;
  verification_status?: VerificationStatus;
  preferred_language?: string;
  avatar_url?: string;
  rating?: number | null;
  rating_count?: number;
}

export interface BackendAdvocatesResponse {
  advocates: Advocate[];
  total: number;
  page: number;
  pages: number;
}

// GET /api/advocate/dashboard
export interface AdvocateDashboardStats {
  verificationStatus: VerificationStatus;
  profileCompleteness: number;
  averageRating?: number | null;
  consultationStats: {
    pending_count: string | number;
    accepted_count: string | number;
    declined_count: string | number;
    closed_count: string | number;
    total_count: string | number;
  };
}

// GET /api/advocates/:id/feedback  +  GET /api/advocate/reviews
export interface FeedbackReview {
  id: string;
  rating: number;
  comment?: string | null;
  citizenName: string;
  createdAt: string;
  isVisible?: boolean;
}

export interface AdvocateFeedbackResponse {
  averageRating: number | null;
  totalCount: number;
  reviews: FeedbackReview[];
}

export interface MyReviewsResponse extends AdvocateFeedbackResponse {
  hiddenCount: number;
}

// ---------------------------------------------------------------------------
// Consultation
// ---------------------------------------------------------------------------

export type ConsultationStatus = 'pending' | 'accepted' | 'declined' | 'closed';

// POST /api/consultations and GET /api/consultations/:id (citizen-side)
export interface BackendConsultationResponse {
  consultationId: string;
  status: ConsultationStatus;
  matterId: string;
  advocateId: string;
  createdAt: string;
  acceptedAt?: string;
  appointmentId?: string;
  scheduledAt?: string;
  appointmentStatus?: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

// Alias for callers that use the camelCase variant
export interface Consultation {
  consultationId: string;
  id?: string;
  matterId: string;
  citizenId?: string;
  advocateId: string;
  status: ConsultationStatus;
  requestedAt?: string;
  createdAt?: string;
  acceptedAt?: string;
}

// GET /api/advocate/consultations (advocate-side row)
export interface AdvocateConsultation {
  id: string;
  status: ConsultationStatus;
  requested_at: string;
  accepted_at?: string;
  query_text: string;
  query_language: 'en' | 'bn';
  classification: Classification;
  citations?: BackendCitation[];
  ai_response_english?: string;
  ai_response_bengali?: string;
  citizen_user_id: string;
  matter_id?: string;
  citizen_note?: string;
  advocate_note?: string;
}

// ---------------------------------------------------------------------------
// WebSocket chat
// Socket.IO namespace /ws on http://localhost:4000
// ---------------------------------------------------------------------------

export interface WsMessage {
  messageId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  text: string;
  moderationStatus: 'cleared' | 'flagged' | 'pending';
  timestamp: string;
}

// Local UI representation for chat history rendering
export interface Message {
  id: string;
  consultationId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  content: string;
  moderationStatus: 'approved' | 'cleared' | 'pending' | 'flagged';
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Onboarding wizard payload (POST /api/advocate/profile / submit-verification)
// ---------------------------------------------------------------------------

export interface OnboardingPayload {
  // Step 1
  name: string;
  phone: string;
  // Step 2
  bar_enrolment_number: string;
  state_bar: string;
  year_of_enrolment: number;
  courts: string[];
  // Step 3
  practice_areas: string[];
  languages: string[];
  districts: string[];
  bio: string;
  availability_mode: 'online' | 'in_person' | 'both';
  address?: string;
}
