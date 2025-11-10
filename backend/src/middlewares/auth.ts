import { createRemoteJWKSet, jwtVerify } from "jose";
import { prisma } from "../prisma";

const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL!));
const ISSUER = process.env.SUPABASE_ISSUER!;
const AUD = process.env.SUPABASE_AUDIENCE!;

// console.log("JWKS", JWKS);
// console.log("ISSUER", ISSUER);
// console.log("AUD", AUD);

export async function verifyToken(authHeader?: string) {
  if (!authHeader?.startsWith("Bearer ")) throw Object.assign(new Error("unauthorized"), { status: 401 });
  // if(authHeader?.split(" ")[0] !== "Bearer" && authHeader !== undefined) throw Object.assign(new Error("unauthorized"), { status: 401 });
    const token = authHeader?.split(" ")[1];
    const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER, audience: AUD });
    return payload;
}

export function requireAuth() {
  return async (req: any, _res: any, next: any) => {
    try {
      const payload = await verifyToken(req.headers.authorization);
      // console.log("payload", payload);
      const sub = String(payload.sub);
      const email = payload.email as string | undefined;
      const meta = (payload.user_metadata as any) || {};
      const role = meta.role === "admin" ? "admin" : "user";
      // console.log('role',role);
      // Extract industries from metadata (array of strings)
      const industries = meta.industries && Array.isArray(meta.industries) 
        ? meta.industries.map((ind: string) => ind.toUpperCase()) as any
        : [];
      
      await prisma.appUser.upsert({
        where: { supabaseUserId: sub },
        update: {
          email,
          role: role.toUpperCase() as any,
          subscription: meta.subscription ? (String(meta.subscription).toUpperCase() as any) : undefined,
          industries: industries.length > 0 ? industries : undefined,
        },
        create: {
          supabaseUserId: sub,
          email,
          role: role.toUpperCase() as any,
          subscription: meta.subscription ? (String(meta.subscription).toUpperCase() as any) : undefined,
          industries: industries.length > 0 ? industries : [],
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
