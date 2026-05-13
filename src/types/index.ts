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
  id: string;
  userId: string;
  name: string;
  barEnrolmentNumber: string;
  stateBar: string;
  address: string;
  phone: string;
  email?: string;
  practiceAreas: string[];
  courts: string[];
  languages: string[];
  districts: string[];
  verificationStatus: 'pending' | 'verified' | 'rejected';
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

export interface Message {
  id: string;
  consultationId: string;
  senderType: 'citizen' | 'advocate';
  senderId: string;
  content: string;
  moderationStatus: 'approved' | 'pending' | 'flagged';
  createdAt: string;
}