/**
 * LINE Login (OAuth 2.0) integration for account linking.
 * Modern approach: user clicks "LINEで連携" → LINE Login → auto-link.
 */
import axios from 'axios';
import { ENV } from '../env';
import { prisma } from '../prisma';

const LINE_OAUTH_BASE = 'https://access.line.me/oauth2/v2.1';
const LINE_API_BASE = 'https://api.line.me/oauth2/v2.1';

/**
 * Build the LINE Login authorization URL.
 * @param state - CSRF token (should be random, stored in session)
 * @returns Full authorization URL to redirect user to
 */
export function buildLineLoginUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ENV.LINE_LOGIN_CHANNEL_ID,
    redirect_uri: ENV.LINE_LOGIN_CALLBACK_URL,
    state,
    scope: 'profile openid', // profile = displayName, userId, pictureUrl
    bot_prompt: 'normal', // 'aggressive' to auto-add bot as friend, 'normal' = optional
  });
  return `${LINE_OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token + ID token.
 */
async function getTokens(code: string): Promise<{
  access_token: string;
  id_token: string;
  expires_in: number;
}> {
  const response = await axios.post(
    `${LINE_API_BASE}/token`,
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ENV.LINE_LOGIN_CALLBACK_URL,
      client_id: ENV.LINE_LOGIN_CHANNEL_ID,
      client_secret: ENV.LINE_LOGIN_CHANNEL_SECRET,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );
  return response.data;
}

/**
 * Verify and decode LINE ID token (JWT).
 * Returns { sub: lineUserId, name: displayName, picture: pictureUrl } if valid.
 */
async function verifyIdToken(idToken: string): Promise<{
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
}> {
  // LINE ID tokens can be verified by checking signature against LINE's public keys
  // or by calling LINE's verify endpoint.
  // For simplicity, we use LINE's verify endpoint (less robust but easier).
  const response = await axios.post(
    `${LINE_API_BASE}/verify`,
    new URLSearchParams({
      id_token: idToken,
      client_id: ENV.LINE_LOGIN_CHANNEL_ID,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  const payload = response.data;
  if (!payload.sub) {
    throw new Error('Invalid ID token: missing sub claim');
  }

  return {
    sub: payload.sub, // LINE user ID
    name: payload.name,
    picture: payload.picture,
    email: payload.email,
  };
}

/**
 * Full LINE Login callback flow: exchange code → verify token → link to appUser.
 * @returns { lineUserId, displayName, linked: true }
 */
export async function handleLineLoginCallback(
  code: string,
  state: string,
  appUserId: string,
  expectedState: string,
): Promise<{ lineUserId: string; displayName: string | null; linked: boolean }> {
  // CSRF check
  if (state !== expectedState) {
    throw new Error('State mismatch (CSRF). Please try again.');
  }

  // Exchange code for tokens
  const tokens = await getTokens(code);

  // Verify ID token
  const profile = await verifyIdToken(tokens.id_token);
  const lineUserId = profile.sub;
  const displayName = profile.name || null;

  // Upsert LineUser and link to appUser
  await prisma.lineUser.upsert({
    where: { lineUserId },
    update: { appUserId, displayName },
    create: { lineUserId, appUserId, displayName },
  });

  return { lineUserId, displayName, linked: true };
}
