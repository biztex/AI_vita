/**
 * Translates Supabase authentication error messages from English to Japanese
 */
export function translateSupabaseError(error: Error | string): string {
  const errorMessage = typeof error == 'string' ? error : error.message

  // Common Supabase auth error messages and their Japanese translations
  const errorMap: Record<string, string> = {
    // Invalid login credentials
    'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
    'Invalid email or password': 'メールアドレスまたはパスワードが正しくありません',
    'Email not confirmed': 'メールアドレスが確認されていません。確認メールを確認してください',
    
    // Email errors
    'Email already registered': 'このメールアドレスは既に登録されています',
    'This email address has already been registered.': 'このメールアドレスは既に登録されています',
    'User already registered': 'このメールアドレスは既に登録されています',
    'Email rate limit exceeded': 'メール送信回数の上限に達しました。しばらくしてから再度お試しください',
    'For security purposes, you can only request this once every 60 seconds': 'セキュリティのため、60秒に1回のみリクエストできます',
    
    // Password errors
    'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
    'Password is too weak': 'パスワードが弱すぎます。より強いパスワードを設定してください',
    'New password should be different from the old password': '新しいパスワードは古いパスワードと異なる必要があります',
    
    // Session errors
    'Invalid session': 'セッションが無効です。再度ログインしてください',
    'Session expired': 'セッションの有効期限が切れました。再度ログインしてください',
    'JWT expired': 'セッションの有効期限が切れました。再度ログインしてください',
    
    // Token errors
    'Token has expired': 'トークンの有効期限が切れています',
    'Invalid token': '無効なトークンです',
    'Password reset link expired': 'パスワードリセットリンクの有効期限が切れています',
    
    // User errors
    'User not found': 'ユーザーが見つかりません',
    'User already exists': 'このユーザーは既に存在します',
    
    // Network/Server errors
    'Network request failed': 'ネットワークエラーが発生しました。接続を確認してください',
    'Failed to fetch': 'ネットワークエラーが発生しました。接続を確認してください',
    'An error occurred': 'エラーが発生しました',
    
    // General errors
    'Signup is disabled': '新規登録は現在無効になっています',
    'Email signup is disabled': 'メールアドレスでの新規登録は現在無効になっています',
  }

  // Check for exact match
  if (errorMessage.length>0) {
    console.log("errorMessage",errorMessage);
    return errorMap[errorMessage]
  }

  // Check for partial matches (case-insensitive)
  const lowerErrorMessage = errorMessage.toLowerCase()
  for (const [englishError, japaneseError] of Object.entries(errorMap)) {
    if (lowerErrorMessage.includes(englishError.toLowerCase())) {
      return japaneseError
    }
  }

  // Check for specific patterns - check for "already registered" patterns first
  if (lowerErrorMessage.includes('already') && (lowerErrorMessage.includes('registered') || lowerErrorMessage.includes('exists'))) {
    if (lowerErrorMessage.includes('email') || lowerErrorMessage.includes('user')) {
      return 'このメールアドレスは既に登録されています'
    }
    return '既に登録されています'
  }

  if (lowerErrorMessage.includes('rate limit')) {
    return 'リクエスト回数が多すぎます。しばらくしてから再度お試しください'
  }

  if (lowerErrorMessage.includes('email')) {
    if (lowerErrorMessage.includes('invalid')) {
      return '無効なメールアドレスです'
    }
    if (lowerErrorMessage.includes('already') || lowerErrorMessage.includes('exists')) {
      return 'このメールアドレスは既に登録されています'
    }
  }

  if (lowerErrorMessage.includes('password')) {
    if (lowerErrorMessage.includes('weak') || lowerErrorMessage.includes('short')) {
      return 'パスワードが弱すぎます。より強いパスワードを設定してください'
    }
    if (lowerErrorMessage.includes('incorrect') || lowerErrorMessage.includes('wrong')) {
      return 'パスワードが正しくありません'
    }
  }

  if (lowerErrorMessage.includes('session') || lowerErrorMessage.includes('token')) {
    if (lowerErrorMessage.includes('expired') || lowerErrorMessage.includes('invalid')) {
      return 'セッションが無効または期限切れです。再度ログインしてください'
    }
  }

  // Default fallback for unknown errors
  return 'エラーが発生しました。もう一度お試しください'
}

/**
 * Helper function to translate Supabase errors that might be in AuthError format
 */
export function translateSupabaseAuthError(error: unknown): string {
  console.log("translateSupabaseAuthError",error);
  if (error instanceof Error) {
    return translateSupabaseError(error)
  }
  if (typeof error === 'string') {
    return translateSupabaseError(error)
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return translateSupabaseError(String((error as any).message))
  }
  return 'エラーが発生しました。もう一度お試しください'
}
