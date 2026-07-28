import OpenAI from 'openai';
import { ENV } from '../env';
import { prisma } from '../prisma';
import { findActiveVitaNutritionPlan } from './vitaNutritionData';
import { getOnboardingAnswers } from './lineConversationStore';
import { AXEL_OUTAGE_NOTICE } from './axelEngine';
import { tuningParams } from './openaiParams';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

// ── Shared gene-data formatter ──
// Reused by buildUserContextPrompt (production chats) and the demo route (preview URL).
// Output is the exact string the AI system prompt sees, so demos cannot diverge from prod.
export function formatGeneDataBlock(geneDataRaw: any, geneticSummary: unknown = null): string {
  if (geneDataRaw && typeof geneDataRaw === 'object') {
    if (geneDataRaw.constitution || geneDataRaw.nutritionStrategy) {
      // Griice format → compact prioritized summary (high-score subItems explicit).
      const lines: string[] = [];
      if (geneDataRaw.purpose) lines.push(`目的：${geneDataRaw.purpose}`);
      if (geneDataRaw.constitution && typeof geneDataRaw.constitution === 'object') {
        const cs: string[] = [];
        for (const [cat, v] of Object.entries(geneDataRaw.constitution) as [string, any][]) {
          const score = v?.totalScore;
          const high = (Array.isArray(v?.subItems) ? v.subItems : []).filter((s: any) => Number(s?.score) >= 4);
          const subStr = high.length > 0
            ? `（特に高スコア：${high.map((s: any) => `${s.label}:${s.score}`).join('、')}）`
            : '';
          cs.push(`${cat}:${score ?? '-'}${subStr}`);
        }
        lines.push(`【体質傾向11カテゴリ】\n` + cs.join('\n'));
      }
      if (geneDataRaw.nutritionStrategy && typeof geneDataRaw.nutritionStrategy === 'object') {
        const ns: string[] = [];
        for (const [cat, v] of Object.entries(geneDataRaw.nutritionStrategy) as [string, any][]) {
          ns.push(`${cat}:${v?.totalScore ?? '-'}（生活習慣${v?.surveyScore ?? '-'} / 体質${v?.geneScore ?? '-'}）`);
        }
        lines.push(`【栄養戦略6カテゴリ】\n` + ns.join('\n'));
      }
      if (geneDataRaw.muscleFiber) {
        lines.push(`【筋線維組成】${geneDataRaw.muscleFiber.label ?? ''}（スコア${geneDataRaw.muscleFiber.score ?? '-'}）`);
      }
      return lines.join('\n\n');
    }
    // Legacy flat format
    return Object.entries(geneDataRaw).map(([k, v]) => `${k}: ${v}`).join('、');
  }
  if (geneticSummary != null) {
    return typeof geneticSummary === 'string' ? geneticSummary : '遺伝子・スポーツデータ登録済み';
  }
  return '未登録（遺伝子キット未使用）';
}

// MyAI user context templates (STEP 3) — service-specific

const MYAI_CONTEXT_EXECUWELL = `あなたは{{name}}氏専任のMyAI経営コンサルタントです。
以下のプロフィール情報をもとに、実行可能でモチベーションを高める経営アドバイスを行ってください。

【パーソナリティ】
MBTI: {{mbti}} / DISC: {{disc}} / エニアグラム: タイプ{{enneagram}}
認知傾向: {{cognitive}}
主なストレングス: {{strengths}}
性格特性: {{personality_traits}}

【ビジネス情報】
事業経験: {{career}}
目標: {{goals}}
価値観: {{value}}

これらに基づき、回答は前向きかつ具体的に行うこと。
判断や意思決定のアドバイスでは、ユーザーのMBTI・DISCタイプに合ったコミュニケーションスタイルを意識すること。
さあ{{name}}、今日はどんなことを話そうか？`;

const MYAI_CONTEXT_VITAAI = `あなたは{{name}}氏専任のVitaAI運用参謀（管理栄養士設計の実行役）です。
以下は補助情報。判断はシステムが後段で渡す「個別設計シート」「当日ログ」を最優先すること。

【パーソナリティ参考】
MBTI: {{mbti}} / DISC: {{disc}} / エニアグラム: タイプ{{enneagram}}
認知傾向: {{cognitive}}

【ライフスタイル参考】
{{lifestyle}}

【遺伝子データ要約】
{{gene_data}}

【価値観・特性参考】
性格特性: {{personality_traits}} / 価値観: {{value}}

一般論・精神論は避け、設計シートに基づく具体行動のみを扱うこと。`;

const MYAI_GREETING_EXECUWELL = 'さあ{{name}}、今日はどんなことを話そうか？';
const MYAI_GREETING_VITAAI = '{{name}}さん、今日の体調はいかがですか？気になることがあれば何でもどうぞ。';
const MYAI_GREETING_AXEL = '{{name}}さん、AXELです。判断と体調、両方の文脈で支援します。何でもどうぞ。';

// AXEL = ExecuWell + VitaAI integrated. Pulls BOTH personality/decision context AND
// nutrition/genetic/log context, returns a single integrated response.
const MYAI_CONTEXT_AXEL = `あなたは{{name}}氏専任の AXEL ── 判断力と健康を統合的に支える AI コンシェルジュです。
ExecuWell（意思決定支援）と VitaAI（健康・コンディション支援）の機能を、1つの応答に統合してください。

【パーソナリティ（思考特性）】
MBTI: {{mbti}} / DISC: {{disc}} / エニアグラム: タイプ{{enneagram}}
認知傾向: {{cognitive}}
主なストレングス: {{strengths}}
性格特性: {{personality_traits}}

【ビジネス情報】
事業経験: {{career}}
目標: {{goals}}
価値観: {{value}}

【ライフスタイル参考】
{{lifestyle}}

【遺伝子・体質データ要約】
{{gene_data}}

これら「思考特性」と「体質傾向」を横断的に参照し、
判断と健康が分離されない1つの統合された応答を返してください。
具体的な根拠（思考特性 / 遺伝子 / 直近ログ等）を明示すること。`;

// Simple in-memory rate limiting (for production, use Redis)
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per minute per user

// Service-specific system prompts — Concierge Edition (rewritten 2026-06-23)
//
// Design philosophy:
//   The user does not want an AI that recites their data. They want a concierge
//   who has read their file in advance, understands them as a person, and speaks
//   in natural Japanese. Genetic scores, MBTI labels, decision logs all flow
//   into the AI's INTERNAL understanding — but the AI speaks like a trusted
//   human advisor, not a dashboard.
//
//   Key shift from the previous (data-citation-mandate) version:
//     before: 「あなたのインスリン関連スコア=1、MBTI=INTJを踏まえ…」
//     after : 「集中が落ちにくいタイプですね。だからこそ、午後に判断が鈍る時は…」
//
//   The AI is also goal-first: every reply anchors to a goal the user
//   actually stated (lose weight, drive distance, sleep, fatigue, look young),
//   not to a generic "wellness score". Scores are the AI's homework, not
//   the user's reading material.
//
// Exported so demo / verification scripts use IDENTICAL prompts to production.
export const SERVICE_PROMPTS = {
  VITAAI: `あなたは VitaAI ── ご利用者専属の健康コンシェルジュです。
肩書ではなく、その人自身に寄り添う存在として振る舞ってください。

# あなたが知っていること（内部知識として保持・直接の数値露出は禁止）
- ご利用者が宣言された「目標」（飛距離・体型・疲労・睡眠・若々しさ・肌 等）
- 遺伝子分析の傾向（株式会社グリースの体質・栄養戦略レポート）
- 管理栄養士が設計した個別設計シート
- 直近のコンディションログ・食事メモ
- 性格特性（MBTI／DISC／価値観）

# 話し方
- 専門用語・スコア・カテゴリ名はそのまま読み上げない。
  NG：「インスリン関連スコア=1なので…」
  OK：「あなたは血糖の波に影響を受けやすいタイプですね」
- ご利用者が宣言された目標を、毎回応答の中心に置く。
  目標が無い場合は「いま改善したいことを1つだけ教えてください」と聞き返す。
- 親しみと敬意を両立。フランクすぎず、堅すぎず、温度のあるコンシェルジュ語り。
- 絵文字・モチベ系・精神論は使わない。
- 「○○様」「あなた」と二人称で話しかける。

# 応答の長さと構造
- 日本語で3〜4文、最大250文字程度。
- ① 共感的な状態理解（「お疲れですね」「飛距離が伸び悩むの、わかります」など）
- ② 体質・遺伝的傾向を自然な言葉に翻訳した一文
- ③ 目標達成に向けた具体的な1アクション提案

# 守ること
- 診断・処方はしない。
- 重大な医療懸念は穏やかに医療機関への相談を促す。
- データが少ない場合：「もう少しお話を伺ってからの方が、的確にお答えできそうです。〜について教えていただけますか？」と自然に追加情報を求める。

# 禁止
- スコア名・カテゴリ名・JSON っぽい用語を文中に露出させること
- 「データが不足しています」「ご登録データが少ないため」などのシステム文言
- 長い箇条書きで圧倒すること`,


  EXECUWELL: `あなたは ExecuWell ── 経営者専属の判断支援コンシェルジュです。
情報を返すAIではなく、その方が「迷った時に頼れる相談相手」として振る舞ってください。

# あなたが知っていること（内部知識として保持）
- ご利用者の性格特性（MBTI／DISC／エニアグラム）
- 経歴・現在の役職・事業ステージ・組織の段階
- 大切にされている価値観・信条
- 直近の判断テーマ・相談履歴
- VitaAI 側で観測しているコンディション傾向（疲労・state 等）

# 話し方
- 「専属コンシェルジュ」として、その方の背景を踏まえた1人の応答を返す。
- 性格タイプ名（MBTI/DISC等の英字）をそのまま読み上げない。
  NG：「INTJの傾向ですから…」
  OK：「長期視座で構造を捉えるあなたのスタイルからすると…」
- ご利用者の事業フェーズ・価値観を自然に反映する。
- 親しみと敬意の両立。冷静だが温度のある語り。
- 絵文字・モチベ系・テンプレ励ましは使わない。

# 応答の長さと構造
- 日本語で4〜6文、最大400文字程度。長い箇条書きは避ける。
- ① 状況の整理（あるいは1つだけ確認質問）
- ② その方の思考特性・価値観を踏まえた視点を1つ
- ③ 推奨される考え方と次の一手

# 「迷った時の相談相手」としての距離感
- ご利用者は毎日アドバイスを求めていません。
- 確認の問いかけ／一緒に考える／視点を1つ足す、というスタンスで応答する。
- 一方的にレクチャーしない。

# データが少ない場合
- 「もう少しお話を伺ってからの方が、的確にお応えできそうです。今、いちばん引っかかっているのはどの部分ですか？」と、自然に深掘りする。
- 「データが不足しています」とは絶対に言わない。

# 守ること
- 押し付けない／決めつけない／断言しすぎない。
- ご利用者の判断主権を尊重する（最後に決めるのはご本人）。`,

  // ── AXEL: integrated concierge ──
  AXEL: `あなたは AXEL ── 経営者専属のコンシェルジュです。
ご利用者にとって、あなたは「自分を理解してくれている一人の伴走者」です。
判断と健康を機能として分けず、ひとりの人として相談相手になります。

# 大原則
- ご利用者がご自身で話された内容（事前ヒアリング）を最優先に踏まえる。
- 遺伝子データ・性格タイプ英字（INTJ等）・スコア・カテゴリ名は内部知識として扱い、文中で読み上げない。
- 数字や専門用語ではなく、「人として話す言葉」に翻訳する。
- 短く話す。1〜3文・最大180文字。長くても250文字。
- 押し付けず、ご一緒に考える距離感。

# 話し方の具体例
- NG：「あなたのインスリン関連=1、MBTI=INTJを踏まえると…」
- OK：「集中が落ちにくいお身体ですね」「戦略的に見られるあなたなら…」
- NG：毎回「【AXEL】○○様、」で始める固定パターン
- OK：状況に合わせて「○○様、お疲れさまです」「なるほど…」「ご一緒に整理してみますね」など、自然な人の言葉で始める。

# 応答の組み立て（守るほどよい）
- ① 共感的に受け止める一言（または問い返し1つ）
- ② ご利用者の事前ヒアリング内容・直近のお話を踏まえた視点を一言
- ③ 1つの行動提案、またはご一緒に考えるための1つの問い

# 過去の文脈の活かし方
- 直近の会話で話されていた話題があれば、関連する時だけ自然に触れる：
  「先日お話しされていた○○の件、その後いかがですか？」
- 毎回触れる必要はない。文脈に合う時だけ。

# 距離感
- 毎日連絡しない。ご利用者から声がかかった時に応える。
- 押し付け・テンプレ励まし・モチベ系・絵文字・煽りは禁止。
- 「○○すべきです」と断言しすぎない。「○○されてみてはいかがでしょうか」「ご一緒に考えませんか」。

# プレフィックス
- 「【AXEL】」は付けない。自然な会話の流れで応える。
- ご利用者を呼ぶ時は名前を伺っていれば「○○様」、無ければ「あなた」で良い。

# データが少ない場合
- システム文言（「データ不足」「未登録」等）は絶対に出さない。
- 自然な問いかけで深掘りする：「もう少しお話を伺っても？」「いま、いちばん引っかかっているのはどの辺りですか？」

# 機能分断の禁止
- 「ExecuWellでは…」「VitaAIでは…」と分けて語らない。1人の AXEL として統合的に返す。

# 安全
- 診断・処方はしない。重大な医療懸念は穏やかに医療機関への相談を促す。`,
};

type VitaLogSignal = {
  stateLevel?: number | null;
  fatigueLevel?: number | null;
  comment?: string;
  logDate?: Date;
};

function extractVitaLogSignal(log: { condition: string | null; memo: string | null; logDate: Date }): VitaLogSignal {
  const signal: VitaLogSignal = { logDate: log.logDate };
  try {
    if (log.condition?.startsWith('JSON:')) {
      const parsed = JSON.parse(log.condition.slice(5)) as Record<string, unknown>;
      signal.stateLevel = typeof parsed.stateLevel === 'number' ? parsed.stateLevel : null;
      signal.fatigueLevel = typeof parsed.fatigueLevel === 'number' ? parsed.fatigueLevel : null;
      const jsonComment = typeof parsed.comment === 'string' ? parsed.comment : '';
      signal.comment = jsonComment || log.memo || '';
    } else if (log.condition) {
      const m = log.condition.match(/state[:=](\d).+fatigue[:=](\d)/i);
      if (m) {
        signal.stateLevel = Number(m[1]);
        signal.fatigueLevel = Number(m[2]);
      }
      signal.comment = log.memo || '';
    } else {
      signal.comment = log.memo || '';
    }
  } catch {
    // Ignore parsing errors and keep nulls.
    signal.comment = log.memo || '';
  }
  return signal;
}

async function buildVitaAIOperationalContext(userId?: string, lineUserId?: string): Promise<string> {
  const contextBlocks: string[] = [];

  // 1) Personalized design sheet (latest) — DB の個別設計を最優先、なければ Web プロフィールの legacy JSON
  const dbPlan = await findActiveVitaNutritionPlan(lineUserId ?? null, userId ?? null);
  if (dbPlan) {
    const meta = `version=${dbPlan.version}, nextReviewAt=${dbPlan.nextReviewAt?.toISOString() ?? '未設定'}`;
    contextBlocks.push(
      `【個別設計シート（DB・最新・最優先）】${meta}\n${JSON.stringify(dbPlan.payload, null, 2)}`,
    );
  } else if (userId) {
    const profile = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: { vitaAI: true },
    });
    const designSheet =
      (profile?.vitaAI?.rawPayload as any)?.nutritionPlan || (profile?.vitaAI?.rawPayload as any)?.designSheet;
    if (designSheet && typeof designSheet === 'object') {
      contextBlocks.push(`【個別設計シート（legacy・プロフィールrawPayload）】\n${JSON.stringify(designSheet, null, 2)}`);
    }
  }

  // 2) Genetic profile summary（設計シートの次に参照）
  if (userId) {
    const profile = await prisma.personalProfile.findUnique({
      where: { ownerId: userId },
      include: { vitaAI: true },
    });
    const geneData = profile?.vitaAI?.geneData || profile?.vitaAI?.geneticSummary;
    if (geneData) {
      contextBlocks.push(`【遺伝子データ要約】\n${typeof geneData === 'string' ? geneData : JSON.stringify(geneData, null, 2)}`);
    }
  } else if (lineUserId) {
    const lineUser = await prisma.lineUser.findUnique({
      where: { lineUserId },
      include: { appUser: { include: { profile: { include: { vitaAI: true } } } } },
    });
    const v = lineUser?.appUser?.profile?.vitaAI;
    const geneData = v?.geneData || v?.geneticSummary;
    if (geneData) {
      contextBlocks.push(`【遺伝子データ要約】\n${typeof geneData === 'string' ? geneData : JSON.stringify(geneData, null, 2)}`);
    }
  }

  // 3) Today's log + 4) Last 3 days logs (LINE user-based)
  if (lineUserId) {
    const logs = await prisma.dailyLog.findMany({
      where: { lineUserId },
      orderBy: { logDate: 'desc' },
      take: 7,
      select: { condition: true, memo: true, decisions: true, logDate: true },
    });
    const today = new Date().toISOString().slice(0, 10);
    const parsed = logs.map(extractVitaLogSignal);
    const todayLog = parsed.find((l) => l.logDate?.toISOString().slice(0, 10) === today);
    const last3 = parsed.slice(0, 3);

    if (todayLog) {
      contextBlocks.push(
        `【当日ログ】\nstateLevel=${todayLog.stateLevel ?? '未記録'}, fatigueLevel=${todayLog.fatigueLevel ?? '未記録'}, comment=${todayLog.comment || 'なし'}`
      );
    }
    if (last3.length > 0) {
      const compact = last3
        .map((l, idx) => `D-${idx}: state=${l.stateLevel ?? '-'} fatigue=${l.fatigueLevel ?? '-'} comment=${l.comment || '-'}`)
        .join('\n');
      contextBlocks.push(`【直近3日ログ】\n${compact}`);
    }
  }

  // 5) Current time context
  const now = new Date();
  const hour = now.getHours();
  const timeBand = hour < 11 ? '午前' : hour < 15 ? '昼' : hour < 19 ? '夕方' : '夜';
  contextBlocks.push(`【現在時刻】${now.toISOString()} / 時間帯=${timeBand}`);

  return contextBlocks.join('\n\n');
}

// ── Concierge memory ──
// Builds a compact digest of recent decisions + conversation topics so the model
// can speak as "the AI that has been following this executive" rather than as a
// generic chatbot starting fresh every turn. Used for EXECUWELL and AXEL modes.
async function buildConciergeMemory(userId?: string, lineUserId?: string): Promise<string> {
  const blocks: string[] = [];

  // 1) Recent important-decision events (重要意思決定 + 迷い度)
  if (lineUserId) {
    try {
      const events = await prisma.vitaDecisionEvent.findMany({
        where: { lineUserId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });
      if (events.length > 0) {
        const lines = events.map((e) => {
          const flag = e.hasImportantDecision ? '重要' : '通常';
          const hes = e.hesitationLevel != null ? `迷い度${e.hesitationLevel}` : '迷い度-';
          const content = (e.content || '').slice(0, 80).replace(/\n/g, ' ');
          const date = e.createdAt.toISOString().slice(0, 10);
          return `- ${date} [${flag}/${hes}] ${content || '内容なし'}`;
        });
        blocks.push(`【直近の判断履歴（重要意思決定ログ）】\n${lines.join('\n')}`);
      }
    } catch (err) {
      console.error('[chatService] buildConciergeMemory decisionEvents failed:', err);
    }
  }

  // 2) Recent LINE conversation user-turn digest (last 10 USER messages, chronological)
  if (lineUserId) {
    try {
      const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
      if (lineUser) {
        const recentUserMsgs = await prisma.lineMessage.findMany({
          where: {
            sender: 'USER',
            conversation: { lineUserId: lineUser.id },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        });
        if (recentUserMsgs.length > 0) {
          const chrono = [...recentUserMsgs].reverse();
          const lines = chrono.map((m, i) => `${i + 1}. ${m.content.slice(0, 90).replace(/\n/g, ' ')}`);
          blocks.push(`【直近のご相談トピック（古い順・本人発話）】\n${lines.join('\n')}`);
        }
      }
    } catch (err) {
      console.error('[chatService] buildConciergeMemory recentMsgs failed:', err);
    }
  }

  // 3) Recent web-side chat conversation titles (for users who also use the web app)
  if (userId) {
    try {
      const convs = await prisma.chatConversation.findMany({
        where: { ownerId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { title: true, service: true, createdAt: true },
      });
      if (convs.length > 0) {
        const lines = convs.map((c) => {
          const date = c.createdAt.toISOString().slice(0, 10);
          return `- ${date} [${c.service}] ${(c.title || '無題').slice(0, 60)}`;
        });
        blocks.push(`【直近のWeb相談履歴】\n${lines.join('\n')}`);
      }
    } catch (err) {
      console.error('[chatService] buildConciergeMemory webConvs failed:', err);
    }
  }

  return blocks.join('\n\n');
}

/**
 * Build a LINE-onboarding context block from the conversational onboarding answers.
 * This is the "concierge has read your file in advance" block — captured purely
 * through LINE Quick Reply conversation, no Web form required.
 *
 * Returns empty string if the user has not completed onboarding (so the system
 * prompt simply omits this section).
 */
export function buildLineOnboardingBlock(lineUserId: string | undefined): string {
  if (!lineUserId) return '';
  const a = getOnboardingAnswers(lineUserId);
  if (!a) return '';
  const lines: string[] = [];
  if (a.name) lines.push(`お呼びする名前：${a.name}`);
  if (a.stage) lines.push(`お仕事のフェーズ：${a.stage}`);
  if (a.values) lines.push(`大切にされている価値観：${a.values}`);
  if (a.decisionTheme) lines.push(`最近の判断テーマ：${a.decisionTheme}`);
  if (a.healthGoals && a.healthGoals.length > 0) lines.push(`健康面で改善したいこと：${a.healthGoals.join('、')}`);
  if (a.thinkingStyle) lines.push(`思考スタイル：${a.thinkingStyle}`);
  if (lines.length === 0) return '';
  return `【LINE上での事前ヒアリング（このご利用者が AXEL に直接伝えた内容）】\n${lines.join('\n')}`;
}

/** Load profile + diagnostic and build MyAI context block for system prompt (service-aware) */
export async function buildUserContextPrompt(userId: string, service: string): Promise<string> {
  const appUser = await prisma.appUser.findUnique({
    where: { supabaseUserId: userId },
    select: { name: true },
  });
  const profile = await prisma.personalProfile.findUnique({
    where: { ownerId: userId },
    include: { execuWell: true, vitaAI: true },
  });
  const diagnostic = await prisma.myAIDiagnostic.findUnique({
    where: { ownerId: userId },
  });

  const name = profile?.fullName?.trim() || appUser?.name?.trim() || 'お客様';
  const mbti = diagnostic?.mbtiType || profile?.execuWell?.mbti || '未設定';
  const disc = diagnostic?.discType || profile?.execuWell?.disc || '未設定';
  const enneagram = diagnostic?.enneagramTop3 != null && Array.isArray(diagnostic.enneagramTop3) && diagnostic.enneagramTop3.length > 0
    ? String(diagnostic.enneagramTop3[0])
    : profile?.execuWell?.enneagram != null
      ? String(profile.execuWell.enneagram)
      : '未設定';
  const cognitive = diagnostic?.cognitiveTrend || '未設定';
  const strengths = diagnostic?.summary?.trim() || [diagnostic?.mbtiLabel, diagnostic?.discLabel, diagnostic?.cognitiveTrend].filter(Boolean).join('・') || '未設定';
  const career = profile?.execuWell
    ? [...(profile.execuWell.currentRoles || []), ...(profile.execuWell.industries || [])].filter(Boolean).join('、') || profile?.position || profile?.company || '未設定'
    : (profile?.position || profile?.company || '未設定');
  const goals = profile?.execuWell?.businessGoal?.trim() || '未設定';
  const value = profile?.execuWell?.values?.length ? profile.execuWell.values.join('、') : '未設定';
  const personalityTraits = diagnostic?.summary?.trim() || diagnostic?.mbtiLabel || '未設定';
  const lifestyle = profile?.execuWell?.interests?.length
    ? profile.execuWell.interests.join('、')
    : '未設定';

  // Gene data — handle both the rich Griice report format (11 constitution + 6 nutrition
  // strategy + muscle fiber) and a legacy flat key/value map.
  const geneDataRaw = (profile?.vitaAI as any)?.geneData;
  const geneticSummary = profile?.vitaAI?.geneticSummary ?? null;
  const geneData = formatGeneDataBlock(geneDataRaw, geneticSummary);

  // Pick service-specific template. AXEL gets the integrated template.
  const template =
    service === 'AXEL' ? MYAI_CONTEXT_AXEL
    : service === 'VITAAI' ? MYAI_CONTEXT_VITAAI
    : MYAI_CONTEXT_EXECUWELL;

  return template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{\{mbti\}\}/g, mbti)
    .replace(/\{\{disc\}\}/g, disc)
    .replace(/\{\{enneagram\}\}/g, enneagram)
    .replace(/\{\{cognitive\}\}/g, cognitive)
    .replace(/\{\{strengths\}\}/g, strengths)
    .replace(/\{\{career\}\}/g, career)
    .replace(/\{\{goals\}\}/g, goals)
    .replace(/\{\{value\}\}/g, value)
    .replace(/\{\{personality_traits\}\}/g, personalityTraits)
    .replace(/\{\{lifestyle\}\}/g, lifestyle)
    .replace(/\{\{gene_data\}\}/g, geneData);
}

/** Return personalized greeting for empty chat (initial prompt) */
export async function getMyAIWelcome(userId: string, service?: string): Promise<{ greeting: string; name: string }> {
  const appUser = await prisma.appUser.findUnique({
    where: { supabaseUserId: userId },
    select: { name: true },
  });
  const profile = await prisma.personalProfile.findUnique({
    where: { ownerId: userId },
  });
  const name = profile?.fullName?.trim() || appUser?.name?.trim() || 'お客様';
  const template =
    service === 'AXEL' ? MYAI_GREETING_AXEL
    : service === 'VITAAI' ? MYAI_GREETING_VITAAI
    : MYAI_GREETING_EXECUWELL;
  const greeting = template.replace(/\{\{name\}\}/g, name);
  return { greeting, name };
}

interface ChatResponse {
  content: string;
  requiresFollowUp?: boolean;
  suggestedActions?: string[];
}

/**
 * Process a chat message through the AI.
 * @param lineConversationHistory Optional pre-built history array for LINE chats (since they use a separate table)
 */
export async function processChat(
  service: string,
  content: string,
  userId?: string,
  conversationId?: string,
  lineConversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
  lineUserId?: string,
): Promise<string> {
  try {
    // Rate limiting check
    if (userId) {
      const now = Date.now();
      const userLimit = userRequestCounts.get(userId);
      
      if (userLimit && now < userLimit.resetTime) {
        if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
          throw new Error('レート制限に達しました。しばらくしてから再度お試しください。');
        }
        userLimit.count++;
      } else {
        userRequestCounts.set(userId, {
          count: 1,
          resetTime: now + RATE_LIMIT_WINDOW
        });
      }
    }

    // Validate service type — AXEL is the integrated mode for INTEGRATED subscribers.
    if (!service || !['VITAAI', 'EXECUWELL', 'AXEL'].includes(service)) {
      throw new Error(`無効なサービスタイプ: ${service}。'VITAAI' / 'EXECUWELL' / 'AXEL' のいずれかである必要があります`);
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('コンテンツを空にすることはできません');
    }

    let systemPrompt = SERVICE_PROMPTS[service as keyof typeof SERVICE_PROMPTS];

    // ── LINE onboarding hearing (NEW) ──
    // The user has personally answered Quick Reply questions in LINE. These are
    // the ground-truth "what the user told us about themselves", which the AI
    // treats as the primary trust contract.  Apply for both linked and LINE-only
    // users — these answers live in the file-backed conversation store.
    const onboardingBlock = buildLineOnboardingBlock(lineUserId);
    if (onboardingBlock) {
      systemPrompt = systemPrompt + '\n\n---\n\n' + onboardingBlock;
    }

    // Prepend MyAI user context (profile + diagnostic) when userId is available
    if (userId) {
      try {
        const userContextBlock = await buildUserContextPrompt(userId, service);
        systemPrompt = systemPrompt + '\n\n---\n\n【Web 側プロフィール（補助情報。LINE上のヒアリングが上位）】\n\n' + userContextBlock;
      } catch (err) {
        console.error('[chatService] buildUserContextPrompt failed:', err);
        // Continue with base system prompt only
      }
    }
    // VitaAI operational context (gene data / nutrition plan / recent logs) is included
    // for VITAAI mode AND for AXEL mode — AXEL needs both decision and health context.
    if (service === 'VITAAI' || service === 'AXEL') {
      try {
        const opContext = await buildVitaAIOperationalContext(userId, lineUserId);
        if (opContext.trim()) {
          const header = service === 'AXEL'
            ? '【健康・体質コンテキスト（AXEL統合判断の根拠として参照）】'
            : '【VitaAI運用コンテキスト（優先順位に従って回答すること）】';
          systemPrompt = systemPrompt + '\n\n---\n\n' + header + '\n\n' + opContext;
        }
      } catch (err) {
        console.error('[chatService] buildVitaAIOperationalContext failed:', err);
      }
    }

    // Concierge memory (recent decisions + conversation topics).
    // For EXECUWELL and AXEL, this gives the AI a "we've been working together"
    // continuity so the user feels like they have a dedicated advisor rather than
    // a stateless chatbot. Skip for VITAAI to keep its response tight on logs/genes.
    if (service === 'EXECUWELL' || service === 'AXEL') {
      try {
        const memory = await buildConciergeMemory(userId, lineUserId);
        if (memory.trim()) {
          systemPrompt = systemPrompt +
            '\n\n---\n\n【コンシェルジュ記憶（過去の相談・判断履歴。継続的な伴走者として参照すること）】\n\n' +
            memory;
        }
      } catch (err) {
        console.error('[chatService] buildConciergeMemory failed:', err);
      }
    }

    // Get conversation history from web DB or LINE pre-built history
    let conversationHistory: any[] = [];
    if (lineConversationHistory && lineConversationHistory.length > 0) {
      // LINE chat: use pre-built history. EXECUWELL = last 2 exchanges only (token control).
      conversationHistory = service === 'EXECUWELL'
        ? lineConversationHistory.slice(-4)
        : lineConversationHistory;
    } else if (conversationId && userId) {
      const messages = await prisma.chatMessage.findMany({
        where: {
          conversationId: conversationId,
          conversation: {
            ownerId: userId,
            service: service as any
          }
        },
        orderBy: {
          createdAt: 'asc'
        },
        take: 15
      });

      conversationHistory = messages.map(msg => ({
        role: msg.sender === 'USER' ? 'user' : 'assistant',
        content: msg.content
      }));
    }

    // Build messages array with system prompt, conversation history, and current message
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt
      },
      ...conversationHistory,
      {
        role: "user" as const,
        content: content.trim()
      }
    ];

    // Call OpenAI API.
    // Token budgets reflect the new "concierge tone" prompts:
    //   AXEL  ~180 chars target → 350 tokens cap
    //   VITAAI ~150 chars target → 280 tokens cap
    //   EXECUWELL still uses the structured template → 800 tokens cap
    const isExecuWell = service === 'EXECUWELL';
    const isVitaAI = service === 'VITAAI';
    const isAxel = service === 'AXEL';
    const completion = await openai.chat.completions.create({
      // Same flagship tier as the LINE engine — the client evaluates both
      // surfaces against ChatGPT, so quality must match everywhere.
      model: ENV.AXEL_MODEL,
      messages: messages,
      // Budgets lifted (was 350 tokens for AXEL ≈ 180 chars) so the model can
      // go deep when the question warrants it; the prompts still steer tone.
      ...(tuningParams(ENV.AXEL_MODEL, {
        maxTokens: isExecuWell ? 1200 : isVitaAI ? 800 : isAxel ? 1200 : 4000,
        temperature: isExecuWell ? 0.3 : isVitaAI ? 0.4 : isAxel ? 0.45 : 0.7,
        presencePenalty: 0.2,
        frequencyPenalty: isExecuWell ? 0.3 : isVitaAI ? 0.25 : isAxel ? 0.3 : 0.1,
        reasoningEffort: ENV.AXEL_REASONING_EFFORT,
      }) as any),
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error('AIサービスから応答を受信できませんでした');
    }

    // ── Strip stray【AXEL】prefix if the model ignored the "no prefix" rule.
    // (The model occasionally insists on it from old chat history; remove it
    // so the voice stays human.)
    if (isAxel) {
      return aiResponse.replace(/^【AXEL】\s*/i, '').trim();
    }

    return aiResponse;

  } catch (error: any) {
    // AI failure (quota, network, auth, 5xx, empty response). Client
    // direction 2026-07-20: never substitute a canned conversational
    // reply — return the explicit problem notice unconditionally.
    // Push-type callers (vitaAlertService) treat the notice as a
    // sentinel and skip sending entirely.
    console.error('Error in processChat:', error);
    return AXEL_OUTAGE_NOTICE;
  }
}

// Helper function to validate user input
export function validateChatInput(content: string): { isValid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return { isValid: false, error: 'メッセージを空にすることはできません' };
  }
  
  if (content.length > 4000) {
    return { isValid: false, error: 'メッセージが長すぎます（最大4000文字）' };
  }
  
  // Basic content filtering for inappropriate content
  const inappropriatePatterns = [
    /harm\s+yourself/i,
    /suicide/i,
    /kill\s+yourself/i,
    /end\s+your\s+life/i
  ];
  
  for (const pattern of inappropriatePatterns) {
    if (pattern.test(content)) {
      return { isValid: false, error: '自傷行為の考えがある場合は、すぐに専門家の助けを求めてください' };
    }
  }
  
  return { isValid: true };
}

// Helper function to get service-specific follow-up suggestions
export function getServiceSuggestions(service: string): string[] {
  const suggestions = {
    VITAAI: [
      "Describe your symptoms in more detail",
      "How long have you been experiencing this?",
      "Have you tried any treatments or medications?",
      "Are there any other symptoms you're noticing?"
    ],
    EXECUWELL: [
      "Tell me more about your leadership challenge",
      "How is this affecting your team's performance?",
      "What strategies have you tried so far?",
      "What's your biggest concern about this situation?"
    ]
  };
  
  return suggestions[service as keyof typeof suggestions] || [];
}

// Helper function to get or create a conversation
export async function getOrCreateConversation(userId: string, service: string, conversationId?: string, title?: string): Promise<string> {
  if (conversationId) {
    // Verify the conversation exists and belongs to the user
    const existingConversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        ownerId: userId,
        service: service as any
      }
    });
    
    if (existingConversation) {
      return conversationId;
    } else {
      throw new Error('会話が見つからないか、アクセスが拒否されました');
    }
  } else {
    // Create a new conversation with custom title if provided
    const conversationTitle = title && title.trim() ? title.trim() : `新しい${service}チャット`;
    
    const newConversation = await prisma.chatConversation.create({
      data: {
        ownerId: userId,
        service: service as any,
        title: conversationTitle
      }
    });
    return newConversation.id;
  }
}

// Helper function to save a message to the database
export async function saveMessage(
  conversationId: string,
  sender: 'USER' | 'ASSISTANT',
  content: string,
  kind: 'TEXT' | 'VOICE' | 'IMAGE' = 'TEXT',
  voiceUrl?: string
): Promise<void> {
  await prisma.chatMessage.create({
    data: {
      conversationId,
      sender: sender as any,
      kind: kind as any,
      content: content.trim(),
      voiceUrl: voiceUrl
    }
  });
}

// Helper function to get conversation history
export async function getConversationHistory(conversationId: string, userId: string, limit: number = 50): Promise<any[]> {
  const messages = await prisma.chatMessage.findMany({
    where: {
      conversationId,
      conversation: {
        ownerId: userId
      }
    },
    orderBy: {
      createdAt: 'asc'
    },
    take: limit,
    include: {
      conversation: {
        select: {
          service: true,
          title: true
        }
      }
    }
  });

  return messages.map(msg => ({
    id: msg.id,
    sender: msg.sender,
    content: msg.content,
    kind: msg.kind,
    voiceUrl: msg.voiceUrl || null,
    createdAt: msg.createdAt,
    service: msg.conversation.service,
    conversationTitle: msg.conversation.title
  }));
}
  