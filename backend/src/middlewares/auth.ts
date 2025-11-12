import { jwtVerify, createRemoteJWKSet, type JWTPayload, decodeJwt } from "jose";
import { prisma } from "../prisma";
import { ENV } from "../env";

// For Supabase, the JWKS URL format is: https://<project-ref>.supabase.co/.well-known/jwks.json
// Issuer format: https://<project-ref>.supabase.co/auth/v1
// Audience is typically the JWT secret or can be omitted for user tokens

let JWKS: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!JWKS) {
    try {
      const jwksUrl = ENV.SUPABASE_JWKS_URL;
      console.log("[AUTH] Initializing JWKS from:", jwksUrl);
      // Create JWKS without algorithm restrictions - let it discover from the JWKS endpoint
      JWKS = createRemoteJWKSet(new URL(jwksUrl), {
        timeoutDuration: 5000,
        cooldownDuration: 30000,
      });
    } catch (error: any) {
      console.error("[AUTH] Failed to initialize JWKS:", error.message);
      throw new Error(`Failed to initialize JWKS: ${error.message}`);
    }
  }
  return JWKS;
}

export async function verifyToken(authHeader?: string): Promise<JWTPayload> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }

  try {
    // Decode token to get info (without verification)
    let tokenInfo: any = {};
    try {
      const decoded = decodeJwt(token);
      tokenInfo = {
        iss: decoded.iss,
        aud: decoded.aud,
        sub: decoded.sub
      };
      console.log("[AUTH] Decoded token payload:", tokenInfo);
    } catch (decodeError) {
      console.log("[AUTH] Could not decode token:", decodeError);
    }

    const jwks = getJWKS();
    const issuer = ENV.SUPABASE_ISSUER;

    console.log("[AUTH] Verifying token with issuer:", issuer);

    // Verify token - try different approaches
    let payload: JWTPayload;
    
    // First, try with issuer only (most Supabase tokens work this way)
    try {
      const result = await jwtVerify(token, jwks, { 
        issuer,
      });
      payload = result.payload;
      console.log("[AUTH] Token verified with issuer only");
    } catch (issuerError: any) {
      console.log("[AUTH] Issuer verification failed:", issuerError.message);
      
      // Try without issuer validation (just signature verification)
      try {
        const result = await jwtVerify(token, jwks);
        payload = result.payload;
        console.log("[AUTH] Token verified with signature only");
      } catch (sigError: any) {
        console.error("[AUTH] Signature verification failed:", sigError.message);
        
        // If all else fails, check if it's a JWKS configuration issue
        if (sigError.code === 'ERR_JOSE_NOT_SUPPORTED' || sigError.message?.includes('alg')) {
          // Try to fetch JWKS manually to debug
          try {
            const jwksResponse = await fetch(ENV.SUPABASE_JWKS_URL);
            const jwksData = await jwksResponse.json();
            console.error("[AUTH] JWKS data from endpoint:", JSON.stringify(jwksData, null, 2));
          } catch (fetchError) {
            console.error("[AUTH] Failed to fetch JWKS:", fetchError);
          }
          
          throw Object.assign(
            new Error(`JWT verification failed: ${sigError.message}. Please check that SUPABASE_JWKS_URL is correct and accessible. Expected format: https://<project-ref>.supabase.co/.well-known/jwks.json`), 
            { status: 500, originalError: sigError }
          );
        }
        
        throw sigError;
      }
    }

    console.log("[AUTH] Token verified successfully, sub:", payload.sub);
    return payload;
  } catch (error: any) {
    console.error("[AUTH] Token verification failed:", {
      message: error.message,
      code: error.code,
      name: error.name,
    });
    
    // Re-throw with original status if it's our custom error
    if (error.status) {
      throw error;
    }
    
    throw Object.assign(new Error("unauthorized"), { status: 401 });
  }
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
        return next(Object.assign(new Error("User not found in database"), { status: 404 }));
      }
      
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
