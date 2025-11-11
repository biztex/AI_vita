import express from "express";
import { prisma } from "../prisma";
import { verifyToken } from "../middlewares/auth";

const router = express.Router();

// Valid industry values from Prisma schema
const VALID_INDUSTRIES = [
  "MANUFACTURING",
  "IT_TECHNOLOGY",
  "HEALTHCARE_WELFARE",
  "RETAIL_SERVICE",
  "FINANCE_INSURANCE",
  "REAL_ESTATE_BUILDING",
  "EDUCATION_HUMAN_RESOURCES",
  "GENERAL"
];

// Register endpoint - creates user in database after Supabase registration
router.post("/register", async (req:any, res:any, next:any) => {
  try {
    console.log("[AUTH] Register request received");
    
    // Verify the token from Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
      });
    }

    const payload = await verifyToken(authHeader);
    console.log("[AUTH] Token verified, payload:", { sub: payload.sub, email: payload.email });
    
    const sub = String(payload.sub);
    const email = payload.email as string | undefined;
    const meta = (payload.user_metadata as any) || {};
    const role = meta.role === "admin" ? "admin" : "user";
    
    // Extract and validate industries from metadata
    // Frontend sends values in correct format (e.g., "MANUFACTURING", "IT_TECHNOLOGY")
    let industries: string[] = [];
    if (meta.industries && Array.isArray(meta.industries)) {
      industries = meta.industries
        .map((ind: string) => String(ind).toUpperCase())
        .filter((ind: string) => VALID_INDUSTRIES.includes(ind)) as any;
    }

    console.log("[AUTH] Processing registration for user:", { sub, email, role, industries });

    // Check if user already exists
    const existingUser = await prisma.appUser.findUnique({
      where: { supabaseUserId: sub },
    });

    if (existingUser) {
      console.log("[AUTH] User already exists:", sub);
      // User already exists, return success (idempotent)
      return res.json({
        success: true,
        message: "User already registered",
        user: {
          id: existingUser.supabaseUserId,
          email: existingUser.email,
          role: existingUser.role,
        },
      });
    }

    // Prepare user data
    const userData: any = {
      supabaseUserId: sub,
      email: email || null, // Email is optional in schema
      role: role.toUpperCase() as any,
      subscription: meta.subscription ? (String(meta.subscription).toUpperCase() as any) : "INTEGRATED",
    };

    // Only add industries if we have valid ones
    if (industries.length > 0) {
      userData.industries = industries;
    }

    console.log("[AUTH] Creating user with data:", userData);

    // Create user in database
    const user = await prisma.appUser.create({
      data: userData,
    });

    console.log("[AUTH] User created successfully:", user.supabaseUserId);

    res.json({
      success: true,
      message: "User registered successfully",
      user: {
        id: user.supabaseUserId,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("[AUTH] Registration error:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });

    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - invalid token",
      });
    }

    // Handle Prisma errors
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "User already exists",
      });
    }

    // Pass to error handler
    next(error);
  }
});

export default router;
