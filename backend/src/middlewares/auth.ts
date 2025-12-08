import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "../prisma";

const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL!));
const ISSUER = process.env.SUPABASE_ISSUER!;
const AUD = process.env.SUPABASE_AUDIENCE!;

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
      const meta = (payload.user_metadata as any) || {};
      const role = meta.role === "admin" ? "admin" : "user";
      
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
