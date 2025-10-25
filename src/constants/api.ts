export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  CHAT: {
    SEND: '/chat',
    VOICE_UPLOAD: '/chat/voice/upload',
    VOICE_PROCESS: '/chat/voice/process',
    CONVERSATIONS: '/chat/conversations',
    CONVERSATION: '/chat/conversation',
  },
  USERS: {
    ME: '/users/me',
    LIST: '/users',
    UPDATE: '/users',
  },
  PERSONALITY: {
    UPLOAD: '/personality',
  },
  REPORTS: {
    DAILY: '/reports/daily',
    DAILY_TOGGLE: '/reports/daily/toggle',
    NEWS_TOGGLE: '/reports/news/toggle',
  },
} as const

export const SERVICES = {
  VITAAI: 'VITAAI',
  EXECUWELL: 'EXECUWELL',
} as const

export const MESSAGE_KINDS = {
  TEXT: 'TEXT',
  VOICE: 'VOICE',
  IMAGE: 'IMAGE',
} as const
