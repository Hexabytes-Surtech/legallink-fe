// ============================================================================
// LegalLink — Shared types
// Mirrors the backend contract in FRONTEND_INTEGRATION_GUIDE.md (verified).
// Where the backend is inconsistent (snake_case vs camelCase) both keys are
// declared optional so callers can normalise at the edge.
// ============================================================================

// ---------------------------------------------------------------------------
// Enums / vocab  (§9 of the guide)
// ---------------------------------------------------------------------------
export type Role = 'citizen' | 'advocate' | 'admin';
export type Language = 'en' | 'bn';

export type MatterStatus =
  | 'created' | 'processing' | 'verified' | 'brief_generated' | 'ai_failed';
export type ConsultationStatus = 'pending' | 'accepted' | 'declined' | 'closed';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';
export type VerificationStatus = 'pending' | 'submitted' | 'verified' | 'rejected';
export type ModerationStatus = 'cleared' | 'flagged' | 'dismissed' | 'pending';

export type PracticeArea =
  | 'Criminal' | 'Civil' | 'Family' | 'Labour' | 'Tenancy' | 'Traffic' | 'Consumer';

export type ModerationFlag =
  | 'outcome_promise' | 'comparison_claim' | 'contact_solicitation'
  | 'fee_solicitation' | 'off_platform_payment';

// ---------------------------------------------------------------------------
// Auth & user  (§5.1 / §5.2)
// ---------------------------------------------------------------------------
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  preferred_language?: Language;
  email_verified?: boolean;
  name?: string;
}

// Kept name `User` for existing context imports.
export interface User extends AuthUser {
  avatar_url?: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string; // backend sets an httpOnly cookie; body usually omits it
  user: User;
}

export interface VerifyOtpResponse {
  accessToken: string;
  user: AuthUser;
}

export interface UserProfile {
  id: string;
  email: string;
  email_verified: boolean;
  role: Role;
  name: string | null;
  address: string | null;
  preferred_language: Language;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Matter / AI brief  (§5.3 + §8 quirks)
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
  matterType?: string;
  statute?: string | null;
  primaryDomain?: string;
  userQuestion?: string;
  involvesPolice?: boolean;
  incidentDate?: string | null;
  // May be a plain string OR { state, district } — normalise before render.
  location?: string | ClassificationLocation | null;
  applicableLaws?: ApplicableLaw[];
}

export interface Citation {
  // Backend flat shape. `title` is always present; the rest are relaxed so the
  // legacy mock citation shape ({ title, section?, url?, type }) also satisfies it.
  title: string;
  source?: string;
  section?: string;
  text?: string;
  citation?: string;
  url?: string;
  type?: 'statute' | 'judgment' | 'rule';
}

export interface AiResponse {
  classification: Classification | null;
  citations: Citation[];            // may be [] even when prose exists
  responseEnglish: string | null;
  responseBengali: string | null;
  procedural: string | null;        // newline-joined
  nextSteps: string | null;         // newline-joined
  disclaimer: string;
}

export interface MatterDetail {
  matterId: string;
  status: MatterStatus | string;
  query: string;
  language: Language;
  createdAt: string;
  aiResponse: AiResponse | null;    // null while processing / on failure
}

// GET /matter — citizen's list rows.
// Backend (matter.service.listMattersForCitizen) returns camelCase aliases.
export interface MatterListItem {
  matterId: string;
  status: string;
  query: string;
  language: Language;
  classification: Classification | null;
  createdAt: string;
  updatedAt: string;
  consultationStatus: ConsultationStatus | null;
  advocateId: string | null;
}

export interface MatterDocument {
  documentId: string;
  matterId: string;
  fileUrl: string;
  fileType: string;
  size: number;
  uploadedAt: string;
}

// ---------------------------------------------------------------------------
// Advocate
// ---------------------------------------------------------------------------
export interface AdvocateSelf {
  advocate_id: string;
  name: string;
  address: string | null;
  phone: string | null;
  advocate_email: string | null;
  bar_enrolment_number: string | null;
  state_bar: string | null;
  practice_areas: string[];
  courts: string[];
  languages: string[];
  districts: string[];
  verification_status: VerificationStatus;
  created_at: string;
  updated_at: string;
  auth_email: string;
  preferred_language: Language;
  avatar_url: string | null;
  bio?: string | null;
}

// Public directory card (GET /advocates)
export interface AdvocateCardData {
  id: string;
  name: string;
  bio: string | null;
  practice_areas: string[];
  languages: string[];
  districts: string[];
  state_bar: string | null;
  verification_status: VerificationStatus;
  avatar_url: string | null;
  rating: number | null;
  rating_count: number;
}

export interface AdvocateDirectoryResponse {
  advocates: AdvocateCardData[];
  total: number;
  page: number;
  pages: number;
}

// GET /matter/:id/advocates
export interface MatchedAdvocatesResponse {
  advocates: AdvocateCardData[];
  total: number;
  page: number;
  pages: number;
}

export interface AdvocateDashboard {
  advocateId: string;
  verificationStatus: VerificationStatus;
  rejectionReason: string | null;
  profileCompleteness: number;
  consultationStats: {
    pending_count: string | number;
    accepted_count: string | number;
    declined_count: string | number;
    closed_count: string | number;
    total_count: string | number;
  };
  averageRating: number | null;
}

export interface AdvocateProfileUpdate {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  barEnrolmentNumber?: string;
  stateBar?: string;
  practiceAreas?: string[];
  courts?: string[];
  languages?: string[];
  districts?: string[];
  bio?: string;
}

export interface AdvocateDoc {
  id: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

// ---------------------------------------------------------------------------
// Consultations  (§5.4 / §5.5)
// ---------------------------------------------------------------------------
export interface ConsultationCreateResponse {
  consultationId: string;
  status: ConsultationStatus;
  matterId: string;
  advocateId: string;
  createdAt: string;
}

// Citizen-side list row
export interface ConsultationListItem {
  consultationId: string;
  status: ConsultationStatus;
  matter_id: string;
  advocate_id: string;
  unread: number;
  query: string;
  language: Language;
  advocateName: string;
  advocateVerificationStatus: VerificationStatus;
  matterBrief: string | null;
  created_at: string;
  updated_at: string;
  appointmentId: string | null;
  scheduledAt: string | null;
  appointmentStatus: AppointmentStatus | null;
  hasFeedback?: boolean;
}

export interface ConsultationDetail {
  consultationId: string;
  status: ConsultationStatus;
  matterId: string;
  advocateId: string;
  citizenId: string;
  citizenNote: string | null;
  advocateNote: string | null;
  citizenRead: boolean;
  created_at: string;
  updated_at: string;
  appointmentId: string | null;
  scheduledAt: string | null;
  appointmentStatus: AppointmentStatus | null;
}

// Advocate-side consultation row (GET /advocate/consultations).
// A few fields are optional to also satisfy legacy callers + mock data.
export interface AdvocateConsultation {
  id: string;
  status: ConsultationStatus;
  requested_at: string;
  updated_at?: string;
  citizen_note?: string | null;
  advocate_note?: string | null;
  matter_id?: string;
  query_text: string;
  query_language: Language;
  classification: Classification | null;
  citizen_user_id: string;
  citizen_name?: string;
  brief_json?: AiResponse | null; // only on the detail endpoint
  // legacy / optional
  accepted_at?: string;
  citations?: Citation[];
  ai_response_english?: string;
  ai_response_bengali?: string;
}

// ---------------------------------------------------------------------------
// Feedback / reviews  (§5.5 / §5.6)
// ---------------------------------------------------------------------------
export interface FeedbackReview {
  id: string;
  rating: number;
  comment: string | null;
  citizenName: string;
  createdAt: string;
  isVisible?: boolean;
}

export interface AdvocateFeedback {
  averageRating: number | null;
  totalCount: number;
  reviews: FeedbackReview[];
}

export interface MyReviews extends AdvocateFeedback {
  hiddenCount: number;
}

export interface FeedbackCreateResponse {
  feedbackId: string;
  rating: number;
  comment: string | null;
  isVisible: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Availability & appointments  (§5.6 / §5.7 / §5.8)
// ---------------------------------------------------------------------------
export interface AvailabilityRule {
  id: string;
  day_of_week: number;          // 0=Mon … 6=Sun
  start_time: string;           // HH:MM (IST)
  end_time: string;             // HH:MM (IST)
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface AvailabilitySlot {
  time: string;                 // HH:MM (IST)
  available: boolean;
}

export interface AvailabilityDay {
  date: string;                 // YYYY-MM-DD (IST)
  slots: AvailabilitySlot[];
}

export interface SaveAvailabilityInput {
  slots: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
  }>;
}

export interface AppointmentMutationResponse {
  appointmentId: string;
  status: AppointmentStatus;
  scheduledAt?: string;
}

// ---------------------------------------------------------------------------
// Admin  (§5.9)
// ---------------------------------------------------------------------------
export interface PendingAdvocate {
  id: string;
  bar_enrolment_number: string | null;
  state_bar: string | null;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  practice_areas: string[];
  courts: string[];
  languages: string[];
  districts: string[];
  verification_status: VerificationStatus;
  submitted_at: string | null;
  created_at: string;
  user_email: string;
  documents: Array<{ id: string; fileUrl: string; fileType: string; uploadedAt: string }>;
}

export interface FlaggedMessage {
  messageId: string;
  consultationId: string;
  matterId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  content: string;
  moderationStatus: ModerationStatus;
  moderationFlags: ModerationFlag[];
  createdAt: string;
}

// ---------------------------------------------------------------------------
// WebSocket chat  (§6)
// ---------------------------------------------------------------------------
export interface WsMessage {
  messageId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  text: string;
  moderationStatus: ModerationStatus;
  timestamp: string;
  // Optional file attachment (citizen → advocate). A pure attachment has empty text.
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'pdf';
  attachmentName?: string;
  attachmentSize?: number;
  deleted?: boolean;
}

export interface WsWarning {
  code: string;     // MESSAGE_FLAGGED | CONSULTATION_CLOSED | ...
  message: string;
}

export interface WsTyping {
  senderId: string;
  senderType: 'citizen' | 'advocate';
  isTyping: boolean;
}

// ---------------------------------------------------------------------------
// Onboarding wizard payload (permissive: accepts camelCase + legacy snake_case)
// ---------------------------------------------------------------------------
export interface OnboardingPayload {
  name?: string;
  phone?: string;
  address?: string;
  bio?: string;
  // camelCase (canonical)
  barEnrolmentNumber?: string;
  stateBar?: string;
  practiceAreas?: string[];
  courts?: string[];
  languages?: string[];
  districts?: string[];
  // legacy snake_case
  bar_enrolment_number?: string;
  state_bar?: string;
  year_of_enrolment?: number;
  practice_areas?: string[];
  availability_mode?: 'online' | 'in_person' | 'both';
}
