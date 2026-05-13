export const ROUTES = {
  HOME: '/',
  AUTH: {
    SIGNUP: '/auth/signup',
    LOGIN: '/auth/login',
  },
  APP: {
    INTAKE: '/intake',
    MATTERS: '/matters',
    MATTER_DETAIL: (id: string) => `/matter/${id}`,
    CHAT: (consultationId: string) => `/chat/${consultationId}`,
  },
} as const;