import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../middlewares/auth";
import OpenAI from "openai";
import { ENV } from "../env";

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

const r = Router();

// GET diagnostic result for current user
r.get("/", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const result = await prisma.myAIDiagnostic.findUnique({
      where: { ownerId: req.user.id },
    });
    res.json({ result: result || null });
  } catch (e) {
    next(e);
  }
});

// POST (create or update) diagnostic result
r.post("/", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const {
      answers,
      mbtiType,
      mbtiLabel,
      discType,
      discLabel,
      enneagramTop3,
      cognitiveTrend,
      summary,
    } = req.body;

    if (!answers || !mbtiType || !discType) {
      return res.status(400).json({ error: "診断データが不完全です" });
    }

    const userId = req.user.id;

    // Upsert diagnostic result
    const diagnostic = await prisma.myAIDiagnostic.upsert({
      where: { ownerId: userId },
      update: {
        answers,
        mbtiType,
        mbtiLabel: mbtiLabel || null,
        discType,
        discLabel: discLabel || null,
        enneagramTop3: enneagramTop3 || null,
        cognitiveTrend: cognitiveTrend || null,
        summary: summary || null,
        completedAt: new Date(),
      },
      create: {
        ownerId: userId,
        answers,
        mbtiType,
        mbtiLabel: mbtiLabel || null,
        discType,
        discLabel: discLabel || null,
        enneagramTop3: enneagramTop3 || null,
        cognitiveTrend: cognitiveTrend || null,
        summary: summary || null,
        completedAt: new Date(),
      },
    });

    // Also update ExecuWell profile with MBTI, DISC, Enneagram data
    try {
      let personalProfile = await prisma.personalProfile.findUnique({
        where: { ownerId: userId },
        include: { execuWell: true },
      });

      if (!personalProfile) {
        personalProfile = await prisma.personalProfile.create({
          data: { ownerId: userId },
          include: { execuWell: true },
        });
      }

      const enneagramPrimary = Array.isArray(enneagramTop3) && enneagramTop3.length > 0
        ? enneagramTop3[0]
        : null;

      if (personalProfile.execuWell) {
        await prisma.execuWellProfile.update({
          where: { profileId: personalProfile.id },
          data: {
            mbti: mbtiType,
            disc: discType,
            enneagram: enneagramPrimary,
          },
        });
      } else {
        await prisma.execuWellProfile.create({
          data: {
            profileId: personalProfile.id,
            mbti: mbtiType,
            disc: discType,
            enneagram: enneagramPrimary,
          },
        });
      }
    } catch (profileError) {
      console.error("[DIAGNOSTIC] Failed to sync ExecuWell profile:", profileError);
      // Non-critical: don't fail the whole request
    }

    res.json({ ok: true, diagnostic });
  } catch (e) {
    next(e);
  }
});

// ── POST /diagnostic/phase-complete ──
// Called after each diagnostic phase to generate a partial insight
// Body: { phase: "MBTI" | "DISC" | "ENNEAGRAM", answers: Record<string, string>, mbtiType?, discType?, enneagramTop3? }
r.post("/phase-complete", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { phase, answers, mbtiType, discType, enneagramTop3 } = req.body;
    const userId = req.user.id;

    if (!phase || !answers) {
      return res.status(400).json({ error: "phase and answers are required" });
    }

    // Generate a short, conversational "partial prompt" insight for this phase
    let insightPrompt = '';
    let insightData: Record<string, string> = {};

    switch (phase) {
      case 'MBTI': {
        const type = mbtiType || '';
        const isExtrovert = type.startsWith('E');
        const isIntuitive = type.includes('N');
        const isThinking = type.includes('T');
        insightPrompt = `MBTIタイプ ${type} の結果に基づいて、ユーザーへのカジュアルで短い（1〜2文）フィードバックを日本語で生成してください。「キミって${isExtrovert ? '外向' : '内向'}タイプっぽいですか？」のようなフレンドリーなトーンで。`;
        break;
      }
      case 'DISC': {
        const dType = discType || '';
        insightPrompt = `DISCタイプ ${dType} の結果に基づいて、ユーザーへのカジュアルで短い（1〜2文）フィードバックを日本語で生成してください。「${dType === 'D' ? '結構リーダーシップ強めですね！' : 'チーム作りが得意そうですね！'}」のようなフレンドリーなトーンで。`;
        break;
      }
      case 'ENNEAGRAM': {
        const top = Array.isArray(enneagramTop3) && enneagramTop3.length > 0 ? enneagramTop3[0] : '';
        insightPrompt = `エニアグラムタイプ ${top} の結果に基づいて、ユーザーへのカジュアルで短い（1〜2文）フィードバックを日本語で生成してください。「深い部分が見えてきましたね」のようなフレンドリーなトーンで。`;
        break;
      }
      default:
        return res.status(400).json({ error: "Invalid phase" });
    }

    // Generate insight via GPT
    let insight = '';
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 100,
        temperature: 0.8,
        messages: [
          { role: 'system', content: 'あなたはMyAIパーソナルコンサルタントです。診断の途中で、ユーザーに短いカジュアルなフィードバックを返してください。絵文字を1つだけ使ってOK。' },
          { role: 'user', content: insightPrompt },
        ],
      });
      insight = completion.choices[0]?.message?.content?.trim() || '';
    } catch (err) {
      console.error('[Diagnostic] GPT phase insight failed:', err);
      // Fallback static insights
      const fallbacks: Record<string, string> = {
        MBTI: `MBTI: ${mbtiType || ''} — 性格の輪郭が見えてきましたね！`,
        DISC: `DISC: ${discType || ''} — チームでの強みがわかりますね！`,
        ENNEAGRAM: `エニアグラム — 深層の動機が見えてきました！`,
      };
      insight = fallbacks[phase] || 'いい感じで進んでいますよ！';
    }

    // Save partial insight to the diagnostic record (upsert phaseInsights JSON)
    const existing = await prisma.myAIDiagnostic.findUnique({
      where: { ownerId: userId },
    });

    const currentInsights = (existing?.phaseInsights as Record<string, string>) || {};
    currentInsights[phase] = insight;

    await prisma.myAIDiagnostic.upsert({
      where: { ownerId: userId },
      update: {
        answers,
        phaseInsights: currentInsights,
        ...(mbtiType ? { mbtiType } : {}),
        ...(discType ? { discType } : {}),
        ...(enneagramTop3 ? { enneagramTop3 } : {}),
      },
      create: {
        ownerId: userId,
        answers,
        phaseInsights: currentInsights,
        ...(mbtiType ? { mbtiType } : {}),
        ...(discType ? { discType } : {}),
        ...(enneagramTop3 ? { enneagramTop3 } : {}),
      },
    });

    res.json({ ok: true, phase, insight });
  } catch (e) {
    next(e);
  }
});

export default r;
