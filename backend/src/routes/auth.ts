import express from "express";
import { prisma } from "../prisma";
import { verifyToken } from "../middlewares/auth";
import { isNewsCategory, NEWS_CATEGORIES, type NewsCategory } from "../utils/news-categories.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const VALID_NEWS_CATEGORIES = new Set(NEWS_CATEGORIES);

// Create upload/avatars directory if it doesn't exist
const avatarsDir = path.resolve("upload", "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer for avatar uploads during registration
const avatarStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, avatarsDir);
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname || '') || '.jpg';
    const base = Date.now().toString() + '_' + Math.random().toString(36).substring(7);
    cb(null, `${base}${ext}`);
  },
});

const avatarUpload = multer({ 
  storage: avatarStorage, 
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (_req: any, file: any, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('画像ファイルのみアップロード可能です'), false);
    }
  },
});

// Register endpoint - creates user in database after Supabase registration
// Now accepts FormData with optional avatar and profile data
router.post("/register", avatarUpload.single("avatar"), async (req: any, res: any, next: any) => {
  console.log("[AUTH] Register endpoint called");
  try {
    // Verify the token from Supabase
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: "認証ヘッダーが必要です",
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
        .filter((value: unknown): value is NewsCategory => VALID_NEWS_CATEGORIES.has(value as NewsCategory) && isNewsCategory(value));
    }

    // Extract profile data from request body (FormData fields)
    const { fullName, company, position, birthDate, name } = req.body;

    console.log("[AUTH] Processing registration for user:", { 
      sub, 
      email, 
      name,
      role, 
      interestCategories, 
      hasAvatar: !!req.file 
    });

    // Check if user already exists
    const existingUser = await prisma.appUser.findUnique({
      where: { supabaseUserId: sub },
    });

    if (existingUser) {
      // User already exists, return success (idempotent)
      return res.json({
        success: true,
        message: "ユーザーは既に登録されています",
        user: {
          id: existingUser.supabaseUserId,
          email: existingUser.email,
          name: existingUser.name,
          role: existingUser.role,
        },
      });
    }

    // Handle avatar upload if provided
    let avatarPath: string | null = null;
    if (req.file) {
      avatarPath = `/uploads/avatars/${path.basename(req.file.path)}`;
    }

    // Prepare user data (NO subscription field - as requested)
    // Include name from FormData or fallback to fullName or meta.name
    const userName = name || fullName || meta.name || null;
    
    const userData: any = {
      supabaseUserId: sub,
      email: email || null,
      name: userName,
      role: role.toUpperCase() as any,
      avatarPath: avatarPath || null,
    };

    // Only add categories if we have valid ones
    if (interestCategories.length > 0) {
      userData.industries = interestCategories;
    }

    // Create user in database
    const user = await prisma.appUser.create({
      data: userData,
    });

    // Create PersonalProfile if profile data is provided
    // Use fullName for PersonalProfile (can be different from AppUser.name)
    if (fullName || company || position || birthDate) {
      await prisma.personalProfile.create({
        data: {
          ownerId: sub,
          fullName: fullName || userName || null, // Fallback to name if fullName not provided
          company: company || null,
          position: position || null,
          birthDate: birthDate ? new Date(birthDate) : null,
        },
      });
    }

    res.json({
      success: true,
      message: "ユーザーの登録が完了しました",
      user: {
        id: user.supabaseUserId,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarPath: user.avatarPath,
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
        message: "認証に失敗しました - 無効なトークンです",
      });
    }

    // Handle Prisma errors
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "ユーザーは既に存在しています",
      });
    }

    // Pass to error handler
    next(error);
  }
});

export default router;
