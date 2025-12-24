import express from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middlewares/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

// Create upload/avatars directory if it doesn't exist
const avatarsDir = path.resolve("upload", "avatars");
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

// Configure multer for avatar uploads
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

// GET profile
router.get("/", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;

    // Get personal profile
    const personalProfile = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: { execuWell: true, vitaAI: true },
    });

    // Get user data (including avatarPath, name, and industries)
    const user = await prisma.appUser.findUnique({
      where: { supabaseUserId: userId },
      select: {
        avatarPath: true,
        email: true,
        name: true,
        industries: true,
      },
    });

    res.json({
      success: true,
      profile: personalProfile || {
        id: null,
        ownerId: userId,
        fullName: null,
        company: null,
        position: null,
        birthDate: null,
        execuWell: null,
        vitaAI: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      user: user || { avatarPath: null, email: null, name: null, industries: [] },
    });
  } catch (error: any) {
    console.error("[PROFILE] Get error:", error);
    next(error);
  }
});

// PATCH/UPDATE Personal Profile basic information (with optional avatar and industries)
router.patch("/", requireAuth(), avatarUpload.single("avatar"), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const { fullName, company, position, industries } = req.body;

    // Handle avatar upload if provided
    let avatarPath: string | null = null;
    if (req.file) {
      avatarPath = `/uploads/avatars/${path.basename(req.file.path)}`;
      
      // Update AppUser with avatar path
      await prisma.appUser.update({
        where: { supabaseUserId: userId },
        data: { avatarPath },
      });
    }

    // Handle industries update if provided
    if (industries !== undefined) {
      let industriesArray: string[] = [];
      if (typeof industries === 'string') {
        try {
          industriesArray = JSON.parse(industries);
        } catch {
          industriesArray = [industries];
        }
      } else if (Array.isArray(industries)) {
        industriesArray = industries;
      }

      // Validate and update industries in AppUser
      const { isNewsCategory, NEWS_CATEGORIES } = await import("../utils/news-categories.js");
      const validIndustries = industriesArray.filter((ind) => 
        typeof ind === "string" && isNewsCategory(ind)
      ) as any[];

      await prisma.appUser.update({
        where: { supabaseUserId: userId },
        data: { industries: validIndustries },
      });
    }

    // Get or create personal profile
    let personalProfile = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
    });

    if (!personalProfile) {
      personalProfile = await prisma.personalProfile.create({
        data: {
          ownerId: userId,
          fullName: fullName || null,
          company: company || null,
          position: position || null,
        },
      });
    } else {
      // Update existing profile (no birthDate)
      personalProfile = await prisma.personalProfile.update({
        where: { ownerId: userId },
        data: {
          fullName: fullName !== undefined ? (fullName || null) : personalProfile.fullName,
          company: company !== undefined ? (company || null) : personalProfile.company,
          position: position !== undefined ? (position || null) : personalProfile.position,
        },
      });
    }

    res.json({
      success: true,
      message: "プロフィールを更新しました",
      profile: personalProfile,
      avatarPath: avatarPath || undefined,
    });
  } catch (error: any) {
    console.error("[PROFILE] Update error:", error);
    next(error);
  }
});

// POST/UPDATE ExecuWell profile
router.post("/execuwell", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const {
      mbti,
      enneagram,
      disc,
      industries = [],
      currentRoles = [],
      licenses = [],
      businessGoal,
      values = [],
      interests = [],
      businessChallenges = [],
      healthScore,
      selfScore,
      tone,
      motivationStyle,
      analysisDepth,
    } = req.body;

    // Get or create personal profile
    let personalProfile = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: { execuWell: true },
    });

    if (!personalProfile) {
      personalProfile = await prisma.personalProfile.create({
        data: {
          ownerId: userId,
        },
        include: { execuWell: true },
      });
    }

    // Update or create ExecuWell profile
    if (personalProfile.execuWell) {
      // Update existing
      await prisma.execuWellProfile.update({
        where: { profileId: personalProfile.id },
        data: {
          mbti: mbti || null,
          enneagram: enneagram ? Number(enneagram) : null,
          disc: disc || null,
          industries: Array.isArray(industries) ? industries : [],
          currentRoles: Array.isArray(currentRoles) ? currentRoles : [],
          licenses: Array.isArray(licenses) ? licenses : [],
          businessGoal: businessGoal || null,
          values: Array.isArray(values) ? values : [],
          interests: Array.isArray(interests) ? interests : [],
          businessChallenges: Array.isArray(businessChallenges) ? businessChallenges : [],
          healthScore: healthScore ? Number(healthScore) : null,
          selfScore: selfScore ? Number(selfScore) : null,
          tone: tone || null,
          motivationStyle: motivationStyle || null,
          analysisDepth: analysisDepth || null,
        },
      });
    } else {
      // Create new
      await prisma.execuWellProfile.create({
        data: {
          profileId: personalProfile.id,
          mbti: mbti || null,
          enneagram: enneagram ? Number(enneagram) : null,
          disc: disc || null,
          industries: Array.isArray(industries) ? industries : [],
          currentRoles: Array.isArray(currentRoles) ? currentRoles : [],
          licenses: Array.isArray(licenses) ? licenses : [],
          businessGoal: businessGoal || null,
          values: Array.isArray(values) ? values : [],
          interests: Array.isArray(interests) ? interests : [],
          businessChallenges: Array.isArray(businessChallenges) ? businessChallenges : [],
          healthScore: healthScore ? Number(healthScore) : null,
          selfScore: selfScore ? Number(selfScore) : null,
          tone: tone || null,
          motivationStyle: motivationStyle || null,
          analysisDepth: analysisDepth || null,
        },
      });
    }

    // Return updated profile
    const updated = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: { execuWell: true },
    });

    res.json({
      success: true,
      message: "ExecuWellプロファイルを保存しました",
      profile: updated,
    });
  } catch (error: any) {
    console.error("[PROFILE] ExecuWell save error:", error);
    next(error);
  }
});

// POST/UPDATE VitaAI profile
router.post("/vitaai", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const { genetic_summary, sports_profile, testId, testDate, rawPayload } = req.body;

    // Get or create personal profile
    let personalProfile = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: { vitaAI: true },
    });

    if (!personalProfile) {
      personalProfile = await prisma.personalProfile.create({
        data: {
          ownerId: userId,
        },
        include: { vitaAI: true },
      });
    }

    // Prepare data
    const geneticData = genetic_summary || null;
    const sportsData = sports_profile || null;
    const rawData = rawPayload || (genetic_summary && sports_profile ? { genetic_summary, sports_profile } : null);

    // Update or create VitaAI profile
    if (personalProfile.vitaAI) {
      // Update existing
      await prisma.vitaAiProfile.update({
        where: { profileId: personalProfile.id },
        data: {
          testId: testId || null,
          testDate: testDate ? new Date(testDate) : null,
          geneticSummary: geneticData,
          sportsProfile: sportsData,
          rawPayload: rawData,
        },
      });
    } else {
      // Create new
      await prisma.vitaAiProfile.create({
        data: {
          profileId: personalProfile.id,
          testId: testId || null,
          testDate: testDate ? new Date(testDate) : null,
          geneticSummary: geneticData,
          sportsProfile: sportsData,
          rawPayload: rawData,
        },
      });
    }

    // Return updated profile
    const updated = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: { vitaAI: true },
    });

    res.json({
      success: true,
      message: "VitaAIプロファイルを保存しました",
      profile: updated,
    });
  } catch (error: any) {
    console.error("[PROFILE] VitaAI save error:", error);
    next(error);
  }
});

export default router;

