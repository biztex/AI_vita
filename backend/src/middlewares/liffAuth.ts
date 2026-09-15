import { ENV } from '../env';

/**
 * LIFF ID-token verification for /line/liff/* endpoints.
 *
 * SECURITY (rich-menu review h0): these endpoints used to trust a plain
 * ?lineUserId= query param — anyone holding a LINE user id could read another
 * user's report/karte/plan. Pages now send the LIFF ID token as
 * `Authorization: Bearer <idToken>`; we verify it against LINE's official
 * endpoint and derive the user id from the verified `sub` claim, overriding
 * whatever id the request claimed.
 *
 * Rollout: LIFF_AUTH=lenient (default) still accepts token-less requests via
 * the query param (logged) so live users are not bricked if the LIFF channel
 * lacks the openid scope; switch to LIFF_AUTH=strict once logs show verified
 * traffic.
 */

const LIFF_CHANNEL_ID = (ENV.LIFF_ID_PAGES || '').split('-')[0] || '';
const MODE = (process.env.LIFF_AUTH || 'lenient') as 'lenient' | 'strict';

// token -> { sub, exp(ms) } — LINE ID tokens are short-lived; cache saves a
// verify roundtrip per page fetch within the same LIFF session.
const cache = new Map<string, { sub: string; exp: number }>();

async function verifyIdToken(idToken: string): Promise<string | null> {
  const hit = cache.get(idToken);
  if (hit && hit.exp > Date.now()) return hit.sub;

  try {
    const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ id_token: idToken, client_id: LIFF_CHANNEL_ID }),
    });
    if (!res.ok) return null;
    const claims = (await res.json()) as { sub?: string; exp?: number };
    if (!claims.sub) return null;
    cache.set(idToken, { sub: claims.sub, exp: (claims.exp ? claims.exp * 1000 : Date.now() + 5 * 60_000) });
    if (cache.size > 500) {
      // drop expired entries opportunistically
      const now = Date.now();
      for (const [k, v] of cache) if (v.exp <= now) cache.delete(k);
    }
    return claims.sub;
  } catch (err) {
    console.error('[liffAuth] verify request failed:', (err as any)?.message || err);
    return null;
  }
}

export function requireLiffAuth() {
  return async (req: any, res: any, next: any) => {
    const auth = req.headers.authorization as string | undefined;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;

    if (token) {
      const sub = await verifyIdToken(token);
      if (sub) {
        // Trusted identity: override whatever the request claimed.
        if (req.query && typeof req.query === 'object') req.query.lineUserId = sub;
        if (req.body && typeof req.body === 'object' && 'lineUserId' in req.body) req.body.lineUserId = sub;
        (req as any).liffVerified = true;
        return next();
      }
      // Token present but invalid — reject regardless of mode.
      return res.status(401).json({ error: '認証に失敗しました。LINEアプリから開き直してください。' });
    }

    if (MODE === 'strict') {
      return res.status(401).json({ error: '認証が必要です。LINEアプリから開き直してください。' });
    }
    // Lenient fallback (rollout window): allow the legacy query param, but log
    // so we can see when all traffic carries tokens and flip to strict.
    console.warn(`[liffAuth] token-less request allowed (lenient): ${req.method} ${req.path}`);
    next();
  };
}
