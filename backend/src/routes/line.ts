import { Router, Request, Response } from 'express';
import * as line from '@line/bot-sdk';
import { ENV } from '../env';
import { handleLineEvent } from '../services/lineService';
import { buildLineLoginUrl, handleLineLoginCallback } from '../services/lineLoginService';
import { processChat } from '../services/chatService';
import { requireAuth } from '../middlewares/auth';
import { prisma } from '../prisma';
import { maybePushVitaThresholdAlert } from '../services/vitaAlertService';
import { findActiveVitaNutritionPlan } from '../services/vitaNutritionData';
import { getOnboardingAnswers, getConversationState } from '../services/lineConversationStore';
import { recentMemories } from '../services/axelMemory';

const r = Router();

function parseLevel(value: unknown): number | null {
  if (typeof value === 'number') return value >= 1 && value <= 3 ? value : null;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) && n >= 1 && n <= 3 ? n : null;
  }
  return null;
}

// ── 12 体質領域 normalization ────────────────────────────────────────────────
// Maps an arbitrary geneData payload (whatever shape the genetic-testing company
// returns) into a fixed 12-area array so the frontend renders uniformly.
// Each area: { key, label, value (free text), level (low|mid|high|null) }
// Unknown areas pass through; known synonyms are mapped to canonical keys.
const TAIQUITSU_AREAS_12 = [
  { key: 'fatigue',         label: '疲れやすさ' },
  { key: 'youthfulness',    label: '若々しさ（肌・血管・炎症）' },
  { key: 'beauty',          label: '美しさ（肌・髪・コラーゲン）' },
  { key: 'focus',           label: '集中力の持続時間' },
  { key: 'stress',          label: 'ストレス耐性' },
  { key: 'sleep',           label: '睡眠の質（回復力）' },
  { key: 'weight',          label: '太りやすさ・痩せにくさ' },
  { key: 'muscle',          label: '筋肉のつきやすさ・落ちやすさ' },
  { key: 'bone',            label: '骨の強さ（姿勢・若々しさ）' },
  { key: 'vascular',        label: '血管の若さ（健康寿命）' },
  { key: 'endurance',       label: '瞬発力・持久力' },
  { key: 'injury',          label: '痛み・不調リスク' },
] as const;

const GENE_KEY_SYNONYMS: Record<string, string> = {
  // common Japanese ↔ canonical
  '疲れやすさの原因': 'fatigue', '疲労': 'fatigue', '疲れやすさ': 'fatigue',
  '若々しさの傾向': 'youthfulness', '若々しさ': 'youthfulness',
  '美しさ': 'beauty',
  '集中力': 'focus', '集中力の持続時間': 'focus',
  'ストレス耐性': 'stress',
  '睡眠の質': 'sleep', '回復力': 'sleep',
  '太りやすさ': 'weight', '痩せにくさ': 'weight',
  '筋肉のつきやすさ': 'muscle',
  '骨の強さ': 'bone',
  '血管の若さ': 'vascular',
  '瞬発力・持久力': 'endurance', '持久力': 'endurance', '瞬発力': 'endurance',
  '痛み・不調リスク': 'injury',
};

function inferLevel(v: any): 'low' | 'mid' | 'high' | null {
  if (v == null) return null;
  if (typeof v === 'number') {
    if (v <= 1) return 'low';
    if (v >= 3) return 'high';
    return 'mid';
  }
  const s = String(v);
  if (/低|low|弱|small/i.test(s)) return 'low';
  if (/高|high|強|large/i.test(s)) return 'high';
  if (/中|mid|普通|平均/i.test(s)) return 'mid';
  return null;
}

function normalizeGeneAreas(raw: Record<string, any> | null | undefined) {
  if (!raw || typeof raw !== 'object') {
    return TAIQUITSU_AREAS_12.map((a) => ({ ...a, value: null, level: null as any }));
  }
  // Build canonical mapping from raw keys via synonyms
  const canonical = new Map<string, any>();
  for (const [k, v] of Object.entries(raw)) {
    const ck = GENE_KEY_SYNONYMS[k] || k;
    canonical.set(ck, v);
  }
  return TAIQUITSU_AREAS_12.map((a) => {
    const value = canonical.get(a.key);
    return {
      ...a,
      value: value != null ? String(value) : null,
      level: inferLevel(value),
    };
  });
}

// ── Griice (株式会社グリース) report format normalizer ──
// Detects whether geneData contains the actual Griice "Test Data" report structure
// (11 constitution categories + 6 nutrition strategy categories + muscle fiber indicator)
// and returns it in a shape the frontend can render directly.
function isGriiceFormat(raw: any): boolean {
  return !!(raw && typeof raw === 'object' && (raw.constitution || raw.nutritionStrategy));
}

function levelOfScore(score: number | null | undefined): 'low' | 'mid' | 'high' | null {
  if (score == null || isNaN(Number(score))) return null;
  const s = Number(score);
  if (s <= 2) return 'low';
  if (s >= 4) return 'high';
  return 'mid';
}

function normalizeGriiceReport(raw: any) {
  if (!isGriiceFormat(raw)) return null;

  // Constitution categories (11 main + optional muscle fiber)
  const constitution = raw.constitution && typeof raw.constitution === 'object'
    ? Object.entries(raw.constitution).map(([label, val]: [string, any]) => ({
        label,
        totalScore: typeof val?.totalScore === 'number' ? val.totalScore : null,
        level: levelOfScore(val?.totalScore),
        subItems: Array.isArray(val?.subItems)
          ? val.subItems.map((s: any) => ({
              label: String(s.label),
              score: typeof s.score === 'number' ? s.score : null,
              level: levelOfScore(s.score),
            }))
          : [],
      }))
    : [];

  // Nutrition strategy categories (6)
  const nutritionStrategy = raw.nutritionStrategy && typeof raw.nutritionStrategy === 'object'
    ? Object.entries(raw.nutritionStrategy).map(([label, val]: [string, any]) => ({
        label,
        totalScore: typeof val?.totalScore === 'number' ? val.totalScore : null,
        level: levelOfScore(val?.totalScore),
        surveyScore: typeof val?.surveyScore === 'number' ? val.surveyScore : null,
        geneScore: typeof val?.geneScore === 'number' ? val.geneScore : null,
        comment: typeof val?.comment === 'string' ? val.comment : null,
        suggestions: Array.isArray(val?.suggestions) ? val.suggestions.map(String) : [],
      }))
    : [];

  return {
    purpose: raw.purpose ?? null,
    provider: raw.provider ?? null,
    constitution,
    nutritionStrategy,
    muscleFiber: raw.muscleFiber ?? null,
  };
}

function buildDailyConditionPayload(
  stateLevel: number | null,
  fatigueLevel: number | null,
  comment?: string | null,
): string | null {
  const parts: Record<string, unknown> = {};
  if (stateLevel != null) parts.stateLevel = stateLevel;
  if (fatigueLevel != null) parts.fatigueLevel = fatigueLevel;
  if (comment?.trim()) parts.comment = comment.trim();
  if (Object.keys(parts).length === 0) return null;
  return `JSON:${JSON.stringify(parts)}`;
}

// ── Webhook (POST /line/webhook) ──
// LINE sends events here – needs raw body for HMAC verification.
// Body parsing is handled specifically: the main app skips JSON parse for this path.
r.post(
  '/webhook',
  // Use LINE middleware to verify X-Line-Signature
  line.middleware({
    channelSecret: ENV.LINE_CHANNEL_SECRET,
    channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
  } as line.MiddlewareConfig),
  async (req: Request, res: Response) => {
    const events = (req.body as line.WebhookRequestBody).events ?? [];
    console.log(`[LINE webhook] Received ${events.length} event(s)`);

    // Immediately respond 200 to LINE (must be < 1s)
    res.status(200).json({ ok: true });

    // Process events in background
    for (const event of events) {
      try {
        console.log(`[LINE webhook] Processing event type: ${event.type}`);
        await handleLineEvent(event);
      } catch (err) {
        console.error('[LINE webhook] Error processing event:', err);
      }
    }
  },
);

// ── GET /line/login-url ──
// Returns the LINE Login authorization URL (frontend redirects user here)
r.get('/login-url', requireAuth(), async (req: any, res: any) => {
  try {
    const state = req.query.state as string;
    if (!state) {
      return res.status(400).json({ error: 'state parameter is required' });
    }
    const url = buildLineLoginUrl(state);
    res.json({ url });
  } catch (err: any) {
    console.error('[LINE Login] URL generation failed:', err);
    res.status(500).json({ error: 'Failed to generate LINE Login URL' });
  }
});

// ── POST /line/link-oauth ──
// Modern OAuth callback handler: exchanges code for tokens, verifies, and links accounts
r.post('/link-oauth', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { code, state, expectedState } = req.body;
    if (!code || !state || !expectedState) {
      return res.status(400).json({ error: 'code, state, and expectedState are required' });
    }

    const appUserId = req.user.id;
    const result = await handleLineLoginCallback(code, state, appUserId, expectedState);

    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[LINE Login] OAuth callback failed:', err);
    if (err.message?.includes('State mismatch')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.response?.status === 400) {
      return res.status(400).json({ error: 'LINE Login failed. Code may be expired or invalid.' });
    }
    next(err);
  }
});

// ── Link LINE account to web user (POST /line/link) ──
// DEPRECATED: legacy manual linking (kept for backward compat)
// Authenticated web user sends a linkCode they obtained from LINE
r.post('/link', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { lineUserId } = req.body;
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }

    const appUserId = req.user.id;

    // Check if this LINE user exists
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found. Please add the bot as a friend first.' });
    }

    // Link the accounts
    await prisma.lineUser.update({
      where: { lineUserId },
      data: { appUserId },
    });

    res.json({ ok: true, message: 'LINEアカウントを連携しました' });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'This web account is already linked to a LINE account.' });
    }
    next(err);
  }
});

// ── Unlink LINE account (POST /line/unlink) ──
r.post('/unlink', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const appUserId = req.user.id;
    const lineUser = await prisma.lineUser.findUnique({ where: { appUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'No LINE account linked.' });
    }
    await prisma.lineUser.update({
      where: { id: lineUser.id },
      data: { appUserId: null },
    });
    res.json({ ok: true, message: 'LINE連携を解除しました' });
  } catch (err) {
    next(err);
  }
});

// ── Get LINE link status (GET /line/status) ──
r.get('/status', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const appUserId = req.user.id;
    const lineUser = await prisma.lineUser.findUnique({ where: { appUserId } });
    res.json({
      linked: !!lineUser,
      lineUserId: lineUser?.lineUserId ?? null,
      userMode: lineUser?.userMode ?? null,
      morningPushEnabled: lineUser?.morningPushEnabled ?? false,
    });
  } catch (err) {
    next(err);
  }
});

// ── Toggle morning push (POST /line/morning-push) ──
r.post('/morning-push', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const appUserId = req.user.id;
    const { enabled } = req.body;
    const lineUser = await prisma.lineUser.findUnique({ where: { appUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'No LINE account linked.' });
    }
    await prisma.lineUser.update({
      where: { id: lineUser.id },
      data: { morningPushEnabled: !!enabled },
    });
    res.json({ ok: true, morningPushEnabled: !!enabled });
  } catch (err) {
    next(err);
  }
});

// ── LIFF page routes (no JWT – identified by lineUserId) ──────────────────────

// POST /line/liff/log – save a daily log entry (今日を記録する)
r.post('/liff/log', async (req: Request, res: Response) => {
  try {
    const { lineUserId, condition, decisions, meals, memo, stateLevel, fatigueLevel, comment } = req.body as {
      lineUserId?: string;
      condition?: string;
      decisions?: string;
      meals?: string;
      memo?: string;
      stateLevel?: number | string;
      fatigueLevel?: number | string;
      comment?: string;
    };

    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }

    // Verify lineUserId exists
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found' });
    }

    const parsedStateLevel = parseLevel(stateLevel);
    const parsedFatigueLevel = parseLevel(fatigueLevel);
    const mergedComment = (typeof comment === 'string' && comment.trim()) || (typeof memo === 'string' && memo.trim()) || null;
    const conditionPayload =
      buildDailyConditionPayload(parsedStateLevel, parsedFatigueLevel, mergedComment) ??
      (typeof condition === 'string' && condition.trim() ? condition.trim() : null);

    const log = await prisma.dailyLog.create({
      data: {
        lineUserId,
        condition: conditionPayload,
        decisions: decisions ?? null,
        meals: meals ?? null,
        memo: mergedComment,
      },
    });

    void maybePushVitaThresholdAlert(lineUserId, parsedStateLevel, parsedFatigueLevel).catch((e) =>
      console.error('[LIFF] threshold alert failed:', e),
    );

    res.json({
      ok: true,
      id: log.id,
      normalized: {
        stateLevel: parsedStateLevel,
        fatigueLevel: parsedFatigueLevel,
      },
    });
  } catch (err) {
    console.error('[LIFF] POST /liff/log failed:', err);
    res.status(500).json({ error: 'Failed to save log' });
  }
});

// POST /line/liff/event-log – save decision event log (重要意思決定・迷い度)
r.post('/liff/event-log', async (req: Request, res: Response) => {
  try {
    const { lineUserId, hasImportantDecision, hesitationLevel, content } = req.body as {
      lineUserId?: string;
      hasImportantDecision?: boolean;
      hesitationLevel?: number | string;
      content?: string;
    };
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found' });
    }
    const hes = typeof hesitationLevel === 'string' ? Number(hesitationLevel) : (hesitationLevel ?? null);
    const normalizedHesitation = typeof hes === 'number' && hes >= 1 && hes <= 5 ? hes : null;

    const event = await prisma.vitaDecisionEvent.create({
      data: {
        lineUserId,
        hasImportantDecision: !!hasImportantDecision,
        hesitationLevel: normalizedHesitation,
        content: (content || '').trim() || null,
      },
    });

    res.json({
      ok: true,
      id: event.id,
      event: {
        hasImportantDecision: !!hasImportantDecision,
        hesitationLevel: normalizedHesitation,
      },
    });
  } catch (err) {
    console.error('[LIFF] POST /liff/event-log failed:', err);
    res.status(500).json({ error: 'Failed to save event log' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GENETICS INGESTION
// ─────────────────────────────────────────────────────────────────────────────
// Two intake paths so we can adapt to whatever the genetic-testing company supports:
//   POST /line/genetics/webhook  — direct ingestion (signed by env GENETICS_WEBHOOK_SECRET)
//   POST /line/genetics/manual   — admin-authenticated upload (CSV/JSON paste)
//
// Both write to PersonalProfile → VitaAiProfile.geneData (existing schema, no migration).
// After save, push a LINE notification "遺伝子分析結果が届きました" to the linked user.

import crypto from 'crypto';

function isValidGeneticsSignature(req: Request, body: string): boolean {
  const secret = process.env.GENETICS_WEBHOOK_SECRET;
  if (!secret) return false; // require secret to be configured
  const sigHeader = (req.headers['x-genetics-signature'] || req.headers['x-signature'] || '') as string;
  if (!sigHeader) return false;
  const computed = crypto.createHmac('sha256', secret).update(body).digest('hex');
  // Constant-time compare
  if (computed.length !== sigHeader.length) return false;
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(sigHeader));
}

async function applyGeneticsResult(opts: {
  lineUserId?: string;
  appUserId?: string;
  email?: string;
  testId?: string;
  geneticSummary?: any;
  geneData?: any;
  rawPayload?: any;
}) {
  // Resolve appUserId via lineUserId / email if needed
  let appUserId = opts.appUserId;
  if (!appUserId && opts.lineUserId) {
    const lu = await prisma.lineUser.findUnique({ where: { lineUserId: opts.lineUserId } });
    appUserId = lu?.appUserId ?? undefined;
  }
  if (!appUserId && opts.email) {
    const u = await prisma.appUser.findFirst({ where: { email: opts.email } });
    appUserId = u?.supabaseUserId ?? undefined;
  }
  if (!appUserId) {
    throw new Error('Unable to resolve appUserId for genetics result');
  }

  // Ensure PersonalProfile exists
  let profile = await prisma.personalProfile.findUnique({ where: { ownerId: appUserId } });
  if (!profile) {
    profile = await prisma.personalProfile.create({ data: { ownerId: appUserId } });
  }

  // Upsert VitaAiProfile
  const vita = await prisma.vitaAiProfile.upsert({
    where: { profileId: profile.id },
    create: {
      profileId: profile.id,
      testId: opts.testId ?? null,
      testDate: new Date(),
      geneticSummary: opts.geneticSummary ?? null,
      geneData: opts.geneData ?? null,
      rawPayload: opts.rawPayload ?? null,
    },
    update: {
      testId: opts.testId ?? undefined,
      testDate: new Date(),
      geneticSummary: opts.geneticSummary ?? undefined,
      geneData: opts.geneData ?? undefined,
      rawPayload: opts.rawPayload ?? undefined,
    },
  });

  // Notify the LINE user (best-effort)
  try {
    const lu = await prisma.lineUser.findFirst({ where: { appUserId } });
    if (lu) {
      const { pushText } = await import('../services/lineService');
      await pushText(
        lu.lineUserId,
        '【AXEL】遺伝子分析結果が届きました。\n' +
          'マイページの「私のカルテ」から、12の体質領域に基づく分析をご確認いただけます。\n' +
          'https://liff.line.me/2009125242-ka7XZSEQ/karte',
      );
    }
  } catch (err) {
    console.error('[Genetics] Push notification failed:', err);
  }

  return { appUserId, vitaAiProfileId: vita.id };
}

// POST /line/genetics/webhook — direct from testing company
r.post('/genetics/webhook', async (req: Request, res: Response) => {
  try {
    const bodyText = JSON.stringify(req.body); // express has already parsed JSON
    if (!isValidGeneticsSignature(req, bodyText)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    const payload = req.body as {
      lineUserId?: string;
      email?: string;
      testId?: string;
      geneticSummary?: any;
      geneData?: any;
    };
    const result = await applyGeneticsResult({
      lineUserId: payload.lineUserId,
      email: payload.email,
      testId: payload.testId,
      geneticSummary: payload.geneticSummary,
      geneData: payload.geneData,
      rawPayload: req.body,
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[LINE] POST /genetics/webhook failed:', err);
    res.status(500).json({ error: err?.message || 'Failed to ingest' });
  }
});

// POST /line/genetics/manual — admin-authenticated paste of results
r.post('/genetics/manual', requireAuth(), async (req: any, res: any) => {
  try {
    // Only allow admin role to call this
    if (req.user?.role && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'admin only' });
    }
    const { lineUserId, email, appUserId, testId, geneticSummary, geneData } = req.body as any;
    const result = await applyGeneticsResult({
      lineUserId, email, appUserId, testId, geneticSummary, geneData,
      rawPayload: { source: 'manual', uploadedBy: req.user?.id },
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[LINE] POST /genetics/manual failed:', err);
    res.status(500).json({ error: err?.message || 'Failed to save' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING STATE (derived from existing data, no schema migration needed)
// ─────────────────────────────────────────────────────────────────────────────
// Derived steps:
//   PENDING        — bot added, no AppUser link
//   LINKED         — AppUser linked, no active subscription
//   PLAN_ACTIVE    — active subscription, no gene data yet
//   REPORT_READY   — gene data present, no active nutrition plan
//   ACTIVE         — gene data + active nutrition plan
r.get('/liff/onboarding-state', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string;
    if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });

    const lu = await prisma.lineUser.findUnique({
      where: { lineUserId },
      include: {
        appUser: {
          include: {
            stripeSubscriptions: { where: { status: 'ACTIVE' }, take: 1 },
            profile: { include: { vitaAI: true } },
          },
        },
      },
    });
    if (!lu) return res.status(404).json({ error: 'LINE user not found' });

    const hasAppUser = !!lu.appUserId;
    const activeSub = lu.appUser?.stripeSubscriptions?.[0] ?? null;
    const hasGene = !!(lu.appUser?.profile?.vitaAI?.geneData ?? lu.appUser?.profile?.vitaAI?.geneticSummary);
    const plan = lu.appUserId
      ? await findActiveVitaNutritionPlan(lineUserId, lu.appUserId).catch(() => null)
      : null;
    const hasPlan = !!plan;

    let step: 'PENDING' | 'LINKED' | 'PLAN_ACTIVE' | 'REPORT_READY' | 'ACTIVE' = 'PENDING';
    if (!hasAppUser) step = 'PENDING';
    else if (!activeSub) step = 'LINKED';
    else if (!hasGene) step = 'PLAN_ACTIVE';
    else if (!hasPlan) step = 'REPORT_READY';
    else step = 'ACTIVE';

    res.json({
      step,
      details: {
        hasAppUser,
        activeSubscriptionType: activeSub?.subscriptionType ?? null,
        hasGeneData: hasGene,
        hasNutritionPlan: hasPlan,
        nextReviewAt: plan?.nextReviewAt ?? null,
      },
    });
  } catch (err) {
    console.error('[LIFF] GET /liff/onboarding-state failed:', err);
    res.status(500).json({ error: 'Failed to compute state' });
  }
});

// GET /line/liff/karte?lineUserId=... – 私のカルテ (accumulated data)
r.get('/liff/karte', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string;
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }

    const lineUser = await prisma.lineUser.findUnique({
      where: { lineUserId },
      include: {
        appUser: {
          include: {
            profile: {
              include: { vitaAI: true, execuWell: true },
            },
            stripeSubscriptions: { where: { status: 'ACTIVE' }, take: 1 },
          },
        },
      },
    });

    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found' });
    }

    // Last 30 daily logs
    const logs = await prisma.dailyLog.findMany({
      where: { lineUserId },
      orderBy: { logDate: 'desc' },
      take: 30,
    });

    // Genetic profile.
    // - If geneData is in the Griice (株式会社グリース) report format
    //   (constitution[11] + nutritionStrategy[6] + muscleFiber), pass it through normalized.
    // - Otherwise fall back to the legacy 12-area flat normalizer for backward compatibility.
    const geneRaw = (lineUser.appUser?.profile?.vitaAI as any)?.geneData as Record<string, any> | null | undefined;
    const geneticSummary = lineUser.appUser?.profile?.vitaAI?.geneticSummary ?? null;
    const griiceReport = normalizeGriiceReport(geneRaw);
    const geneAreas = griiceReport ? [] : normalizeGeneAreas(geneRaw);

    // Active subscription type drives AXEL state on the frontend
    const activeSub = lineUser.appUser?.stripeSubscriptions?.[0] ?? null;

    const dbEvents = await prisma.vitaDecisionEvent.findMany({
      where: { lineUserId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const eventLogsFromTable = dbEvents.map((e) => {
      const decisionFlag = e.hasImportantDecision ? '1' : '0';
      return {
        id: e.id,
        logDate: e.createdAt,
        decisions: `EVENT|important=${decisionFlag}|hesitation=${e.hesitationLevel ?? '-'}|content=${(e.content || '').trim() || '-'}`,
        source: 'vita_decision_event' as const,
      };
    });

    const legacyEventLogs = logs
      .filter((l) => (l.decisions || '').startsWith('EVENT|'))
      .slice(0, 20)
      .map((l) => ({
        id: l.id,
        logDate: l.logDate,
        decisions: l.decisions,
        source: 'legacy_daily_log' as const,
      }));

    const eventLogs = [...eventLogsFromTable, ...legacyEventLogs].slice(0, 30);

    const nutritionPlan = await findActiveVitaNutritionPlan(lineUserId, lineUser.appUserId);

    res.json({
      displayName: lineUser.displayName,
      userMode: lineUser.userMode,
      effectiveMode: activeSub?.subscriptionType === 'INTEGRATED'
        ? 'AXEL'
        : (lineUser.userMode === 'VITAAI' ? 'VITAAI' : 'EXECUWELL'),
      activeSubscriptionType: activeSub?.subscriptionType ?? null,
      profile: lineUser.appUser?.profile ?? null,
      subscription: lineUser.appUser?.subscription ?? null,
      logs,
      eventLogs,
      genetics: {
        hasData: !!(geneRaw || geneticSummary),
        summary: geneticSummary,
        // Legacy 12-area shape (still populated when geneData is in flat form)
        areas: geneAreas,
        // New Griice report shape (11 constitution + 6 nutrition + muscle fiber)
        report: griiceReport,
      },
      nutritionPlan: nutritionPlan
        ? {
            id: nutritionPlan.id,
            version: nutritionPlan.version,
            nextReviewAt: nutritionPlan.nextReviewAt,
            effectiveFrom: nutritionPlan.effectiveFrom,
          }
        : null,
    });
  } catch (err) {
    console.error('[LIFF] GET /liff/karte failed:', err);
    res.status(500).json({ error: 'Failed to load karte' });
  }
});

// POST /line/liff/advice – immediate VitaAI advice using latest logs + design context
r.post('/liff/advice', async (req: Request, res: Response) => {
  try {
    const { lineUserId, note } = req.body as { lineUserId?: string; note?: string };
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found' });
    }

    const latest = await prisma.dailyLog.findMany({
      where: { lineUserId },
      orderBy: { logDate: 'desc' },
      take: 3,
      select: { condition: true, decisions: true, memo: true, logDate: true },
    });
    const latestText = latest
      .map((l, i) => `D-${i}: condition=${l.condition || '-'} decisions=${l.decisions || '-'} memo=${l.memo || '-'} date=${l.logDate.toISOString()}`)
      .join('\n');
    const prompt =
      `以下はVitaAIユーザーの最新ログです。\n${latestText}\n` +
      (note?.trim() ? `追加メモ: ${note.trim()}\n` : '') +
      '上記に基づいて、VitaAI運用ルールに沿って助言してください。';

    const advice = await processChat('VITAAI', prompt, lineUser.appUserId ?? undefined, undefined, undefined, lineUserId);
    res.json({ ok: true, advice });
  } catch (err) {
    console.error('[LIFF] POST /liff/advice failed:', err);
    res.status(500).json({ error: 'Failed to generate advice' });
  }
});

// GET /line/liff/plan?lineUserId=... – 戦略書を見る (AI proposals history)
r.get('/liff/plan', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string;
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }

    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found' });
    }

    // Fetch last 20 ASSISTANT messages across all conversations for this LINE user
    const messages = await prisma.lineMessage.findMany({
      where: {
        sender: 'ASSISTANT',
        conversation: { lineUserId: lineUser.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, content: true, createdAt: true },
    });

    res.json({ displayName: lineUser.displayName, messages });
  } catch (err) {
    console.error('[LIFF] GET /liff/plan failed:', err);
    res.status(500).json({ error: 'Failed to load plan' });
  }
});

// POST /line/liff/mode – switch the LINE user's service mode (EXECUWELL ⇔ VITAAI)
// Identified by lineUserId (no web auth) so it works from the LIFF mypage.
r.post('/liff/mode', async (req: Request, res: Response) => {
  try {
    const { lineUserId, mode } = req.body as { lineUserId?: string; mode?: string };
    if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });
    if (mode !== 'EXECUWELL' && mode !== 'VITAAI') {
      return res.status(400).json({ error: 'mode must be EXECUWELL or VITAAI' });
    }
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) return res.status(404).json({ error: 'LINE user not found' });
    await prisma.lineUser.update({ where: { id: lineUser.id }, data: { userMode: mode } });
    res.json({ ok: true, userMode: mode });
  } catch (err) {
    console.error('[LIFF] POST /liff/mode failed:', err);
    res.status(500).json({ error: 'Failed to update mode' });
  }
});

// POST /line/liff/morning-push – toggle morning push from LIFF mypage
r.post('/liff/morning-push', async (req: Request, res: Response) => {
  try {
    const { lineUserId, enabled } = req.body as { lineUserId?: string; enabled?: boolean };
    if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) return res.status(404).json({ error: 'LINE user not found' });
    await prisma.lineUser.update({ where: { id: lineUser.id }, data: { morningPushEnabled: enabled } });
    res.json({ ok: true, morningPushEnabled: enabled });
  } catch (err) {
    console.error('[LIFF] POST /liff/morning-push failed:', err);
    res.status(500).json({ error: 'Failed to update notification setting' });
  }
});

// GET /line/liff/mypage?lineUserId=... – マイページ (plan & settings)
r.get('/liff/mypage', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string;
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }

    const lineUser = await prisma.lineUser.findUnique({
      where: { lineUserId },
      include: {
        appUser: {
          include: {
            stripeSubscriptions: {
              where: { status: 'ACTIVE' },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            profile: true,
          },
        },
      },
    });

    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found' });
    }

    const appUser = lineUser.appUser;

    const activeSub = appUser?.stripeSubscriptions?.[0] ?? null;

    // ── AXEL HOME snapshot ──
    // Today's body / decision / next-action overview so mypage works as
    // a unified "判断 + 体調 + next action" dashboard (not fragmented per-feature).
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [todayLog, lastDecision, lastAssistantMsg] = await Promise.all([
      prisma.dailyLog.findFirst({
        where: { lineUserId, logDate: { gte: todayStart } },
        orderBy: { logDate: 'desc' },
      }),
      prisma.vitaDecisionEvent.findFirst({
        where: { lineUserId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lineMessage.findFirst({
        where: {
          sender: 'ASSISTANT',
          conversation: { lineUser: { lineUserId } },
        },
        orderBy: { createdAt: 'desc' },
        select: { content: true, createdAt: true },
      }),
    ]);

    // Parse condition stateLevel / fatigueLevel from the JSON-encoded condition field
    let todayState: number | null = null;
    let todayFatigue: number | null = null;
    let todayComment: string | null = null;
    if (todayLog?.condition?.startsWith('JSON:')) {
      try {
        const parsed = JSON.parse(todayLog.condition.slice(5)) as Record<string, unknown>;
        todayState = typeof parsed.stateLevel === 'number' ? parsed.stateLevel : null;
        todayFatigue = typeof parsed.fatigueLevel === 'number' ? parsed.fatigueLevel : null;
        todayComment = typeof parsed.comment === 'string' ? parsed.comment : (todayLog.memo ?? null);
      } catch {
        todayComment = todayLog.memo ?? null;
      }
    } else if (todayLog) {
      todayComment = todayLog.memo ?? null;
    }

    // Compute the "next action" hint based on what's missing.
    // This drives the single explicit CTA shown in the AXEL HOME card on mypage.
    let nextAction: { label: string; detail: string; url?: string } = {
      label: '今日を記録する',
      detail: 'まずは1日3秒のコンディション記録から始めましょう。',
      url: 'https://liff.line.me/2009125242-ka7XZSEQ/log',
    };
    if (!activeSub) {
      nextAction = {
        label: 'プランを選ぶ',
        detail: 'AXELを開始するには、まずプランをお選びください。',
        url: 'https://execuwell.jp/subscription',
      };
    } else if (!todayLog) {
      nextAction = {
        label: '今日を記録する',
        detail: '本日のコンディション（体調・疲労感）を3秒で記録してください。',
        url: 'https://liff.line.me/2009125242-ka7XZSEQ/log',
      };
    } else if (todayState != null && todayState >= 3) {
      nextAction = {
        label: 'AXELに相談する',
        detail: '本日のコンディションが重めです。次の判断・行動をAXELで整理しましょう。',
      };
    } else {
      nextAction = {
        label: '戦略書を確認する',
        detail: '直近のAI提案・判断ログを振り返って、次の一手に活かしましょう。',
        url: 'https://liff.line.me/2009125242-ka7XZSEQ/plan',
      };
    }

    res.json({
      displayName: lineUser.displayName,
      userMode: lineUser.userMode,
      effectiveMode: activeSub?.subscriptionType === 'INTEGRATED'
        ? 'AXEL'
        : (lineUser.userMode === 'VITAAI' ? 'VITAAI' : 'EXECUWELL'),
      activeSubscriptionType: activeSub?.subscriptionType ?? null,
      morningPushEnabled: lineUser.morningPushEnabled,
      email: appUser?.email ?? null,
      name: appUser?.name ?? null,
      subscription: appUser?.subscription ?? null,
      activeStripeSubscription: activeSub,
      // ── AXEL HOME snapshot ──
      home: {
        today: todayLog
          ? {
              stateLevel: todayState,
              fatigueLevel: todayFatigue,
              comment: todayComment,
              recordedAt: todayLog.logDate,
            }
          : null,
        lastDecision: lastDecision
          ? {
              hasImportantDecision: lastDecision.hasImportantDecision,
              hesitationLevel: lastDecision.hesitationLevel,
              content: (lastDecision.content || '').slice(0, 100),
              recordedAt: lastDecision.createdAt,
            }
          : null,
        lastAxelReply: lastAssistantMsg
          ? {
              snippet: lastAssistantMsg.content.replace(/【AXEL】/g, '').trim().slice(0, 80),
              receivedAt: lastAssistantMsg.createdAt,
            }
          : null,
        nextAction,
      },
    });
  } catch (err) {
    console.error('[LIFF] GET /liff/mypage failed:', err);
    res.status(500).json({ error: 'Failed to load mypage' });
  }
});

// ── GET /line/message/:id (for LIFF detail view) ──
// LIFF passes messageId and lineUserId (from LIFF context). Returns parsed sections for display.
r.get('/message/:id', async (req: Request, res: Response) => {
  try {
    const messageId = req.params.id as string;
    const lineUserId = (req.query.lineUserId as string) || (req.headers['x-line-user-id'] as string);
    if (!messageId || !lineUserId) {
      return res.status(400).json({ error: 'messageId and lineUserId are required' });
    }

    const message = await prisma.lineMessage.findFirst({
      where: { id: messageId, sender: 'ASSISTANT' },
      include: {
        conversation: {
          include: {
            lineUser: true,
          },
        },
      },
    });

    if (!message || message.conversation.lineUser.lineUserId !== lineUserId) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const { parseExecuWellReply } = await import('../services/execuwellReplyParser');
    const sections = parseExecuWellReply(message.content);

    const nonEmpty = (s: string | undefined | null) => (s && s.trim().length > 0 ? s.trim() : '');
    const fallbackSummary = nonEmpty(sections.summary10s) || nonEmpty(sections.conclusion) || message.content.trim();
    const fallbackAxis = nonEmpty(sections.reasons) || '（判断材料が不足しています。状況・制約・期限のうち1点だけ追記してください）';
    const fallbackRisk = nonEmpty(sections.risks) || '（リスクは未抽出。最悪ケースの下振れを1つだけ想定してください）';
    const fallbackAction = nonEmpty(sections.actions) || '（推奨アクションは未抽出。次の1手を1つだけ決めて実行してください）';
    const fallbackSupplement = nonEmpty(sections.supplement) || '';

    res.json({
      id: message.id,
      content: message.content,
      sections: {
        要点整理: fallbackSummary,
        判断軸: fallbackAxis,
        リスク: fallbackRisk,
        推奨アクション: fallbackAction,
        補足: fallbackSupplement,
      },
    });
  } catch (err) {
    console.error('[LINE] GET /message/:id failed:', err);
    res.status(500).json({ error: 'Failed to load message' });
  }
});

// ─────────────────────────────────────────────────────────────────────
// LIFF pages for the 6-item rich menu (2026-08-11 client design)
// ─────────────────────────────────────────────────────────────────────

/** Resolve the linked AppUser id (ownerId) for a LINE user, or null. */
async function ownerIdFor(lineUserId: string): Promise<string | null> {
  const lu = await prisma.lineUser.findUnique({ where: { lineUserId }, select: { appUserId: true } });
  return lu?.appUserId ?? null;
}

// GET /line/liff/report — AXELレポート: everything AXEL understands about you
r.get('/liff/report', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string;
    if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });

    const onboarding = getOnboardingAnswers(lineUserId) ?? {};
    const state = getConversationState(lineUserId);
    const ownerId = await ownerIdFor(lineUserId);
    const [diagnostic, plan] = await Promise.all([
      ownerId ? prisma.myAIDiagnostic.findUnique({ where: { ownerId } }) : Promise.resolve(null),
      findActiveVitaNutritionPlan(lineUserId, ownerId),
    ]);
    const lineUser = await prisma.lineUser.findUnique({
      where: { lineUserId },
      include: { appUser: { include: { profile: { include: { vitaAI: true } } } } },
    });
    const vita = lineUser?.appUser?.profile?.vitaAI as any;
    const memories = recentMemories(lineUserId, 6).map((m) => ({ topic: m.topic, gist: m.gist, at: m.at }));

    res.json({
      displayName: lineUser?.displayName ?? null,
      profile: onboarding,
      understandingNotes: state?.understandingNotes ?? null,
      personaPrefs: state?.personaPrefs ?? null,
      diagnostic: diagnostic
        ? { mbtiLabel: diagnostic.mbtiLabel, discLabel: diagnostic.discLabel, cognitiveTrend: diagnostic.cognitiveTrend, summary: diagnostic.summary, completedAt: diagnostic.completedAt }
        : null,
      geneSummary: vita?.geneticSummary ?? null,
      hasGeneData: !!vita?.geneData,
      nutritionPlan: plan ? { version: plan.version, nextReviewAt: plan.nextReviewAt, hasPlan: true } : null,
      recentConsultations: memories,
    });
  } catch (err) {
    console.error('[LINE] GET /liff/report failed:', err);
    res.status(500).json({ error: 'Failed to load report' });
  }
});

// GET /line/liff/personalplan — パーソナルプラン: nutritionist plan + history
r.get('/liff/personalplan', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string;
    if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });
    const ownerId = await ownerIdFor(lineUserId);
    const active = await findActiveVitaNutritionPlan(lineUserId, ownerId);
    // History: all plan versions for this user (active + superseded)
    const history = await prisma.vitaNutritionPlan.findMany({
      where: ownerId ? { OR: [{ lineUserId }, { ownerId }] } : { lineUserId },
      orderBy: { version: 'desc' },
      select: { version: true, effectiveFrom: true, nextReviewAt: true, isActive: true },
    });
    res.json({
      hasPlan: !!active,
      plan: active ? { version: active.version, effectiveFrom: active.effectiveFrom, nextReviewAt: active.nextReviewAt, updatedAt: active.updatedAt, payload: active.payload } : null,
      history,
    });
  } catch (err) {
    console.error('[LINE] GET /liff/personalplan failed:', err);
    res.status(500).json({ error: 'Failed to load plan' });
  }
});

// GET /line/liff/personality — 性格診断: existing result (or null → take it)
r.get('/liff/personality', async (req: Request, res: Response) => {
  try {
    const lineUserId = req.query.lineUserId as string;
    if (!lineUserId) return res.status(400).json({ error: 'lineUserId is required' });
    const ownerId = await ownerIdFor(lineUserId);
    const d = ownerId ? await prisma.myAIDiagnostic.findUnique({ where: { ownerId } }) : null;
    res.json({
      linked: !!ownerId,
      hasResult: !!d,
      result: d ? { mbtiType: d.mbtiType, mbtiLabel: d.mbtiLabel, discType: d.discType, discLabel: d.discLabel, enneagramTop3: d.enneagramTop3, cognitiveTrend: d.cognitiveTrend, summary: d.summary, completedAt: d.completedAt } : null,
    });
  } catch (err) {
    console.error('[LINE] GET /liff/personality failed:', err);
    res.status(500).json({ error: 'Failed to load personality' });
  }
});

// POST /line/liff/personality — save a completed diagnostic (scored client-side)
r.post('/liff/personality', async (req: Request, res: Response) => {
  try {
    const { lineUserId, answers, result } = req.body ?? {};
    if (!lineUserId || !answers || !result) return res.status(400).json({ error: 'lineUserId, answers, result required' });
    const ownerId = await ownerIdFor(lineUserId);
    if (!ownerId) return res.status(409).json({ error: 'not_linked', message: 'アカウント連携後に保存できます。' });
    const data = {
      answers, mbtiType: result.mbtiType ?? null, mbtiLabel: result.mbtiLabel ?? null,
      discType: result.discType ?? null, discLabel: result.discLabel ?? null,
      enneagramTop3: result.enneagramTop3 ?? null, cognitiveTrend: result.cognitiveTrend ?? null,
      summary: result.summary ?? null, completedAt: new Date(),
    };
    await prisma.myAIDiagnostic.upsert({ where: { ownerId }, create: { ownerId, ...data }, update: data });
    res.json({ ok: true });
  } catch (err) {
    console.error('[LINE] POST /liff/personality failed:', err);
    res.status(500).json({ error: 'Failed to save personality' });
  }
});

// GET /line/liff/reservation — 面談予約: booking config (external tool)
r.get('/liff/reservation', async (_req: Request, res: Response) => {
  res.json({
    bookingUrl: ENV.RESERVATION_URL,
    types: [
      { key: 'initial', label: '初回カウンセリング' },
      { key: 'followup', label: '再カウンセリング' },
      { key: 'review', label: '見直し面談（3か月後など）' },
    ],
  });
});

export default r;
