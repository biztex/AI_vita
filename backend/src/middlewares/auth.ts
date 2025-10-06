import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "../prisma.js";

const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL!));
const ISSUER = process.env.SUPABASE_ISSUER!;
const AUD = process.env.SUPABASE_AUDIENCE!;

export async function verifyToken(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) throw Object.assign(new Error("unauthorized"), { status: 401 });
  const token = authHeader.slice(7);
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

      await prisma.appUser.upsert({
        where: { supabaseUserId: sub },
        update: { email, role: role.toUpperCase() as any },
        create: {
          supabaseUserId: sub,
          email,
          role: role.toUpperCase() as any,
          subscription: meta.subscription ?? undefined,
        },
      });

      req.user = { id: sub, email, role };
      next();
    } catch (e: any) {
      next(Object.assign(new Error("unauthorized"), { status: 401 }));
    }
  };
}

export function requireAdmin() {
  return (req: any, _res: any, next: any) => {
    if (req.user?.role !== "admin") return next(Object.assign(new Error("forbidden"), { status: 403 }));
    next();
  };
}
