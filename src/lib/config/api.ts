export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || "https://execuwell.jp/backend/",
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
} as const

export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  ALLOWED_AUDIO_TYPES: ['audio/webm', 'audio/mp4', 'audio/wav', 'audio/mpeg'],
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
} as const
