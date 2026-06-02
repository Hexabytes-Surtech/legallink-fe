export const ROUTES = {
  HOME: '/',
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
    ADVOCATE_SIGNUP: '/auth/advocate-signup',
  },
  APP: {
    DASHBOARD: '/dashboard',
    PROFILE: '/profile',
    INTAKE: '/intake',
    MATTERS: '/matters',
    ADVOCATES: '/advocates',
    MATTER_DETAIL: (id: string) => `/matter/${id}`,
    CHAT: (consultationId: string) => `/chat/${consultationId}`,
  },
  ADVOCATE: {
    DASHBOARD: '/advocate/dashboard',
    ONBOARDING: '/advocate/onboarding',
    CONSULTATIONS: '/advocate/consultations',
    CONSULTATION_DETAIL: (id: string) => `/advocate/consultations/${id}`,
    PROFILE: '/advocate/profile',
    DOCUMENTS: '/advocate/documents',
  },
} as const;