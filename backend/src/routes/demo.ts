/**
 * /demo — token-protected preview endpoints for showing the client the actual
 * personalized output a real subscriber would see, without exposing any production
 * user data.
 *
 * Auth model: a single shared token in env DEMO_PREVIEW_TOKEN (rotate via .env).
 * If unset, all demo routes return 503. The token is accepted as either:
 *   - `?token=…` query param
 *   - `X-Demo-Token: …` header
 *
 * Data sources:
 *   - Griice sample report bundled at src/data/griice-sample.json (株式会社グリース提供)
 *   - Synthesized demo user profile (MBTI=INTJ, exec founder) — purely fictional
 *
 * The AXEL response is generated live by the same OpenAI call the production chat
 * uses, with the same SERVICE_PROMPTS.AXEL system prompt and the same gene-data
 * formatter, so what the client sees is what real users will see.
 */
import { Router, Request, Response } from 'express';
import OpenAI from 'openai';
import { ENV } from '../env';
import { tuningParams } from '../services/openaiParams';
import { SERVICE_PROMPTS, formatGeneDataBlock } from '../services/chatService';
import griiceSample from '../data/griice-sample.json';

const r = Router();

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

// ── Synthesized demo user (fictional, for preview only) ──
const DEMO_USER = {
  name: '山田 太郎',
  position: 'スタートアップ経営者',
  industry: 'IT・SaaS',
  mbti: 'INTJ',
  disc: 'D',
  enneagram: '5',
  cognitiveTrend: '戦略型・論理優位',
  strengths: '構想力／論理整合性／長期視座',
  businessGoal: 'シリーズB前の組織拡大期。事業方針の意思決定品質を維持しつつ、自身のコンディションを安定化させたい。',
  values: '戦略性、論理整合性、誠実',
  lifestyle: '平日は会食週3／睡眠5〜6時間／週末は走る',
} as const;

const DEMO_RECENT_LOGS = [
  { date: '昨日', state: 2, fatigue: 4, comment: '会食2件＋深夜まで資料作成' },
  { date: '一昨日', state: 3, fatigue: 3, comment: '取締役合宿の準備で集中' },
  { date: '3日前', state: 4, fatigue: 2, comment: 'コンディション良好' },
] as const;

const DEMO_QUERIES = [
  '明日の取締役会、どう臨むべきか？',
  '最近、午後の判断が鈍る。原因はストレスか食事か？',
  'シリーズB資金調達と組織拡大、優先順位の付け方を整理したい。',
] as const;

const DEMO_SCHEDULE = '明日13:00 取締役会（重要な事業方針判断）／20:00 投資家会食';

function checkDemoToken(req: Request): boolean {
  const expected = process.env.DEMO_PREVIEW_TOKEN;
  if (!expected) return false;
  const given = (req.query.token as string) || (req.header('x-demo-token') as string) || '';
  if (!given) return false;
  // constant-time compare
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

function demoGuard(req: Request, res: Response): boolean {
  if (!process.env.DEMO_PREVIEW_TOKEN) {
    res.status(503).json({ error: 'Demo preview is not configured. Set DEMO_PREVIEW_TOKEN in env to enable.' });
    return false;
  }
  if (!checkDemoToken(req)) {
    res.status(401).json({ error: 'Invalid or missing demo token' });
    return false;
  }
  return true;
}

// ── GET /api/demo/karte ──
// Returns the same shape as /line/liff/karte so the demo page can reuse the karte renderer.
r.get('/karte', (req: Request, res: Response) => {
  if (!demoGuard(req, res)) return;

  const sample: any = griiceSample;
  // Normalize Griice format (inline — keeps demo independent of route internals)
  const levelOfScore = (s: any): 'low' | 'mid' | 'high' | null => {
    if (s == null || isNaN(Number(s))) return null;
    const n = Number(s);
    return n <= 2 ? 'low' : n >= 4 ? 'high' : 'mid';
  };

  const constitution = sample.constitution
    ? Object.entries(sample.constitution).map(([label, val]: [string, any]) => ({
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

  const nutritionStrategy = sample.nutritionStrategy
    ? Object.entries(sample.nutritionStrategy).map(([label, val]: [string, any]) => ({
        label,
        totalScore: typeof val?.totalScore === 'number' ? val.totalScore : null,
        level: levelOfScore(val?.totalScore),
        surveyScore: typeof val?.surveyScore === 'number' ? val.surveyScore : null,
        geneScore: typeof val?.geneScore === 'number' ? val.geneScore : null,
        comment: typeof val?.comment === 'string' ? val.comment : null,
        suggestions: Array.isArray(val?.suggestions) ? val.suggestions.map(String) : [],
      }))
    : [];

  res.json({
    displayName: DEMO_USER.name,
    userMode: 'EXECUWELL',
    effectiveMode: 'AXEL',
    activeSubscriptionType: 'INTEGRATED',
    isDemo: true,
    profile: {
      fullName: DEMO_USER.name,
      position: DEMO_USER.position,
      company: 'デモ株式会社（架空）',
    },
    user: DEMO_USER,
    schedule: DEMO_SCHEDULE,
    recentLogs: DEMO_RECENT_LOGS,
    logs: [],
    eventLogs: [],
    genetics: {
      hasData: true,
      summary: null,
      areas: [],
      report: {
        purpose: sample.purpose ?? null,
        provider: sample.provider ?? null,
        constitution,
        nutritionStrategy,
        muscleFiber: sample.muscleFiber ?? null,
      },
    },
    nutritionPlan: null,
  });
});

// ── POST /api/demo/axel ──
// Generates a live AXEL response from OpenAI using the actual production prompt
// + the demo user context + the Griice sample data. Each invocation returns a
// fresh response so the client can verify personalization quality.
//
// Body: { query?: string }  — if omitted, runs all three example queries.
r.post('/axel', async (req: Request, res: Response) => {
  if (!demoGuard(req, res)) return;

  const queryParam = (req.body?.query as string | undefined)?.trim();
  const queries = queryParam ? [queryParam] : [...DEMO_QUERIES];

  const geneBlock = formatGeneDataBlock(griiceSample);
  const logsBlock = DEMO_RECENT_LOGS
    .map((l, i) => `D-${i} (${l.date}): state=${l.state}, fatigue=${l.fatigue}, ${l.comment}`)
    .join('\n');

  // Build the system prompt the same way processChat does for AXEL:
  // base SERVICE_PROMPTS.AXEL + user context block + health/gene block.
  const userContextBlock =
`【ユーザー基本情報】
氏名：${DEMO_USER.name}（デモ・架空）
役職：${DEMO_USER.position}
業界：${DEMO_USER.industry}

【パーソナリティ（思考特性）】
MBTI: ${DEMO_USER.mbti} / DISC: ${DEMO_USER.disc} / エニアグラム: タイプ${DEMO_USER.enneagram}
認知傾向: ${DEMO_USER.cognitiveTrend}
主なストレングス: ${DEMO_USER.strengths}

【ビジネス情報】
事業目標: ${DEMO_USER.businessGoal}
価値観: ${DEMO_USER.values}

【ライフスタイル】
${DEMO_USER.lifestyle}`;

  const healthBlock =
`【遺伝子・体質データ要約】
${geneBlock}

【直近ログ】
${logsBlock}

【本日のスケジュール】
${DEMO_SCHEDULE}`;

  const systemPrompt =
    SERVICE_PROMPTS.AXEL +
    '\n\n---\n\n【ユーザー情報（このユーザーに合わせた応答をすること）】\n\n' +
    userContextBlock +
    '\n\n---\n\n【健康・体質コンテキスト（AXEL統合判断の根拠として参照）】\n\n' +
    healthBlock;

  try {
    const results = await Promise.all(
      queries.map(async (q) => {
        const completion = await openai.chat.completions.create({
          // Client-facing preview — must show the same tier as production.
          model: ENV.AXEL_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: q },
          ],
          ...(tuningParams(ENV.AXEL_MODEL, {
            maxTokens: 1200,
            temperature: 0.25,
            presencePenalty: 0.1,
            frequencyPenalty: 0.25,
          }) as any),
        });
        let reply = completion.choices[0]?.message?.content?.trim() ?? '';
        if (!reply.startsWith('【AXEL】')) reply = '【AXEL】' + reply;
        return { query: q, reply };
      }),
    );
    res.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      systemPromptPreview: systemPrompt.slice(0, 1200) + (systemPrompt.length > 1200 ? '… (truncated)' : ''),
      results,
    });
  } catch (err: any) {
    console.error('[demo] /axel OpenAI call failed:', err?.message || err);
    res.status(500).json({ error: 'AXEL generation failed', detail: err?.message || String(err) });
  }
});

// ── GET /api/demo/system-prompt ──
// Returns the exact AXEL system prompt that would be sent to OpenAI for the demo
// user. Useful for clients who want to audit what data is being given to the model.
r.get('/system-prompt', (req: Request, res: Response) => {
  if (!demoGuard(req, res)) return;
  const geneBlock = formatGeneDataBlock(griiceSample);
  res.type('text/plain').send(
    SERVICE_PROMPTS.AXEL + '\n\n---\n\n[USER CONTEXT BLOCK]\n\nMBTI=' + DEMO_USER.mbti + ', 事業目標=' + DEMO_USER.businessGoal +
    '\n\n---\n\n[HEALTH/GENE BLOCK]\n\n' + geneBlock,
  );
});

export default r;
