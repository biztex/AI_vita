import express from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middlewares/auth";

const router = express.Router();

// GET current user's profile
router.get("/", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;

    // Get or create personal profile
    let personalProfile = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: {
        execuWell: true,
        vitaAI: true,
      },
    });

    if (!personalProfile) {
      // Create empty profile if it doesn't exist
      personalProfile = await prisma.personalProfile.create({
        data: {
          ownerId: userId,
        },
        include: {
          execuWell: true,
          vitaAI: true,
        },
      });
    }

    res.json({
      success: true,
      profile: personalProfile,
    });
  } catch (error: any) {
    next(error);
  }
});

// PATCH/UPDATE Personal Profile basic information
router.patch("/", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const userId = req.user.id;
    const { fullName, company, position, birthDate } = req.body;

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
          birthDate: birthDate ? new Date(birthDate) : null,
        },
      });
    } else {
      // Update existing profile
      personalProfile = await prisma.personalProfile.update({
        where: { ownerId: userId },
        data: {
          fullName: fullName !== undefined ? fullName : personalProfile.fullName,
          company: company !== undefined ? company : personalProfile.company,
          position: position !== undefined ? position : personalProfile.position,
          birthDate: birthDate !== undefined ? (birthDate ? new Date(birthDate) : null) : personalProfile.birthDate,
        },
      });
    }

    // Also update AppUser if name/email changed
    if (fullName) {
      await prisma.appUser.update({
        where: { supabaseUserId: userId },
        data: {} as any, // Update user metadata if needed
      });
    }

    res.json({
      success: true,
      message: "プロフィールを更新しました",
      profile: personalProfile,
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

