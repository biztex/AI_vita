import express from "express";
import { prisma } from "../prisma";
import { verifyToken } from "../middlewares/auth";

const router = express.Router();

// Register endpoint - creates user in database after Supabase registration
router.post("/register", async (req, res, next) => {
  try {
    // Verify the token from Supabase
    const authHeader = req.headers.authorization;
    const payload = await verifyToken(authHeader);
    
    const sub = String(payload.sub);
    const email = payload.email as string | undefined;
    const meta = (payload.user_metadata as any) || {};
    const role = meta.role === "admin" ? "admin" : "user";
    
    // Extract industries from metadata (array of strings)
    const industries = meta.industries && Array.isArray(meta.industries) 
      ? meta.industries.map((ind: string) => ind.toUpperCase()) as any
      : [];

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

    // Create user in database
    const user = await prisma.appUser.create({
      data: {
        supabaseUserId: sub,
        email,
        role: role.toUpperCase() as any,
        subscription: meta.subscription ? (String(meta.subscription).toUpperCase() as any) : "INTEGRATED",
        industries: industries.length > 0 ? industries : [],
      },
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
    if (error.status === 401) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized - invalid token",
      });
    }
    next(error);
  }
});

export default router;
