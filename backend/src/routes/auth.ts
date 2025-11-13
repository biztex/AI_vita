import express from "express";
import { prisma } from "../prisma";
import { verifyToken } from "../middlewares/auth";
import { isNewsCategory, NEWS_CATEGORIES, type NewsCategory } from "../utils/news-categories.js";

const router = express.Router();

const VALID_NEWS_CATEGORIES = new Set(NEWS_CATEGORIES);

// Register endpoint - creates user in database after Supabase registration
router.post("/register", async (req:any, res:any, next:any) => {
  try {
    // Verify the token from Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "Authorization header is required",
      });
    }
    const payload = await verifyToken(authHeader);
                                                     
    const sub = String(payload.sub);
    const email = payload.email as string | undefined;
    const meta = (payload.user_metadata as any) || {};
    const role = meta.role === "admin" ? "admin" : "user";
    
    // Extract and validate interest categories from metadata
    let interestCategories: NewsCategory[] = [];
    if (meta.industries && Array.isArray(meta.industries)) {
      interestCategories = meta.industries
        .map((value: unknown) => (typeof value === "string" ? value.toLowerCase() : ""))
        .filter((value): value is NewsCategory => VALID_NEWS_CATEGORIES.has(value as NewsCategory) && isNewsCategory(value));
    }

    console.log("[AUTH] Processing registration for user:", { sub, email, role, interestCategories });

    // Check if user already exists
    const existingUser = await prisma.appUser.findUnique({
      where: { supabaseUserId: sub },
    });

    if (existingUser) {
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

    // Only add categories if we have valid ones
    if (interestCategories.length > 0) {
      userData.industries = interestCategories;
    }

    // Create user in database
    const user = await prisma.appUser.create({
      data: userData,
    });

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
