import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "../prisma";

const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL!));
const ISSUER = process.env.SUPABASE_ISSUER!;
const AUD = process.env.SUPABASE_AUDIENCE!;

// Admin allowlist. SECURITY: admin used to be derived from user_metadata.role,
// but user_metadata is CLIENT-writable (anyone signing up via the public anon
// key can set role:"admin" themselves and reach every /admin/* endpoint).
// The JWT's email claim, by contrast, is set by Supabase after verification —
// so admin is now granted only to emails on this server-side list.
const ADMIN_EMAILS = new Set(
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export async function verifyToken(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) throw Object.assign(new Error("認証が必要です"), { status: 401 });
  // if(authHeader?.split(" ")[0] !== "Bearer" && authHeader !== undefined) throw Object.assign(new Error("unauthorized"), { status: 401 });
    const token = authHeader?.split(" ")[1];
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUD });
    return payload;
}

export function requireAuth() {
  return async (req: any, _res: any, next: any) => {
    try {
      const payload = await verifyToken(req.headers.authorization);
      const sub = String(payload.sub);
      const email = payload.email as string | undefined;
      const role = email && ADMIN_EMAILS.has(email.toLowerCase()) ? "admin" : "user";
      
      // Verify user exists in database (user should have been created during signup)
      const user = await prisma.appUser.findUnique({
        where: { supabaseUserId: sub },
      });
      
      if (!user) {
        return next(Object.assign(new Error("データベースにユーザーが見つかりません"), { status: 404 }));
      }
      
      req.user = { id: sub, email, role };
      next();
    } catch (e: any) {
      next(Object.assign(new Error("認証が必要です"), { status: 401 }));
    }
  };
}

export function requireAdmin() {
  return (req: any, _res: any, next: any) => {
    if (req.user?.role !== "admin") return next(Object.assign(new Error("アクセスが拒否されました"), { status: 403 }));
    next();
  };
}
