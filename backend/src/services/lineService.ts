import * as line from '@line/bot-sdk';
import { ENV } from '../env';
import { prisma } from '../prisma';
import { buildLineShortReply } from './execuwellReplyParser';
import {
  getConversationState,
  setConversationState,
  updateConversationState,
  clearConversationState,
  clearTransientPhase,
  isOnboarded,
  getOnboardingAnswers,
  type AxelConversationPhase,
  type OnboardingAnswers,
} from './lineConversationStore';
import { respondAsAxel } from './axelEngine';
import { transcribeAudio } from './axelVoice';

// ── LINE SDK clients ──

const lineConfig: line.ClientConfig = {
  channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: ENV.LINE_CHANNEL_SECRET,
};

export const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
});

// Blob client for fetching message content (images/files). LINE retains
// content only briefly after delivery, so images are fetched immediately.
export const lineBlobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
});

export { lineConfig };

// ── LINE-specific rate limiting (per lineUserId) ──
const lineRateLimits = new Map<string, { count: number; resetTime: number }>();
const LINE_RATE_WINDOW = 60 * 1000; // 1 minute
const LINE_RATE_MAX = 20; // Max messages per minute per LINE user (raised from 8 — real conversations can be rapid)

function checkLineRateLimit(lineUserId: string): boolean {
  const now = Date.now();
  const entry = lineRateLimits.get(lineUserId);
  if (entry && now < entry.resetTime) {
    if (entry.count >= LINE_RATE_MAX) return false; // blocked
    entry.count++;
    return true;
  }
  lineRateLimits.set(lineUserId, { count: 1, resetTime: now + LINE_RATE_WINDOW });
  return true;
}

// ── Reply / Push helpers ──

export async function replyText(replyToken: string, text: string): Promise<void> {
  await lineClient.replyMessage({
    replyToken,
    messages: [{ type: 'text', text }],
  });
}

export async function pushText(lineUserId: string, text: string): Promise<void> {
  await lineClient.pushMessage({
    to: lineUserId,
    messages: [{ type: 'text', text }],
  });
}

/** Build LIFF URL for "詳細を見る" (opens in LINE in-app browser). If LIFF_ID is not set, returns empty. */
function buildLiffDetailUrl(messageId: string, lineUserId: string): string {
  const liffId = ENV.LIFF_ID;
  if (!liffId) return '';
  return `https://liff.line.me/${liffId}?messageId=${encodeURIComponent(messageId)}&lineUserId=${encodeURIComponent(lineUserId)}`;
}

/**
 * Push ExecuWell reply: short text (3–6 lines, conclusion first) + "詳細を見る" button opening LIFF.
 * If LIFF_ID is not set, falls back to full text push.
 */
export async function pushExecuWellReply(
  lineUserId: string,
  fullReply: string,
  messageId: string,
): Promise<void> {
  const shortText = buildLineShortReply(fullReply);
  const detailUrl = buildLiffDetailUrl(messageId, lineUserId);

  if (!detailUrl) {
    await pushText(lineUserId, fullReply.slice(0, 5000));
    return;
  }

  await lineClient.pushMessage({
    to: lineUserId,
    messages: [
      { type: 'text', text: shortText },
      {
        type: 'template',
        altText: '詳細を見る',
        template: {
          type: 'buttons',
          text: '詳細は以下からご確認ください。',
          actions: [
            { type: 'uri', label: '詳細を見る', uri: detailUrl },
          ],
        },
      },
    ],
  });
}

export async function replyWithQuickReply(
  replyToken: string,
  text: string,
  items: line.QuickReplyItem[],
): Promise<void> {
  await lineClient.replyMessage({
    replyToken,
    messages: [
      {
        type: 'text',
        text,
        quickReply: { items },
      },
    ],
  });
}

/** Push a Quick Reply (used when we've already consumed the replyToken). */
async function pushWithQuickReply(
  lineUserId: string,
  text: string,
  items: line.QuickReplyItem[],
): Promise<void> {
  await lineClient.pushMessage({
    to: lineUserId,
    messages: [{ type: 'text', text, quickReply: { items } }],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 「AXEL コンシェルジュ」体験 ── LINE 単独で完結する状態遷移
// ─────────────────────────────────────────────────────────────────────────────
//
// 大方針：
//   ・ご利用者は LINE 内のみで全機能を使えること
//   ・友だち追加直後に「会話形式の事前ヒアリング」を実施
//   ・ヒアリング完了後、「私はあなたをこう理解しています」trust contract を送信
//   ・以降、リッチメニュー4ボタンで「相談する」「今日の一言」「状態」「設定」が完結
//   ・どこからでもプロフィール直接編集はしない（必要なら自然な会話で更新）
//
// 状態は lineConversationStore に file-backed で永続化される（DB 変更不要）。

// ── Onboarding flow (3 questions only — the rest we learn through conversation) ──
//
// Design principle: a real concierge asks 2–3 things at first meeting, then
// learns the rest through the relationship. Six form-style questions felt like
// account registration, which is what the client was unhappy about.
//
// Q1: お呼びする名前（テキスト）
// Q2: 今、いちばん気になっていること（テキスト・自由記述）
// Q3: 判断のスタイル（Quick Reply・4択）

const FOLLOW_INTRO_MESSAGES = (lineDisplayName: string | null): string[] => {
  const greeting = lineDisplayName
    ? `${lineDisplayName}さん、`
    : '';
  // Warm, close, not formal. Like a trusted friend introducing themselves.
  return [
    `${greeting}はじめまして、AXEL です。\nこれからよろしくお願いします。`,
    'いちばん親しい間柄の相談相手として、迷った時にいつでも声をかけてもらえる存在になりたいと思っています。',
    'まず、なんて呼んだらいいかな？\n（ニックネームでも大丈夫です）',
  ];
};

function qrPostback(label: string, data: string, displayText?: string): line.QuickReplyItem {
  return {
    type: 'action',
    action: { type: 'postback', label, data, displayText: displayText ?? label },
  };
}

function onboardingThinkingStyleQR(): line.QuickReplyItem[] {
  return [
    qrPostback('戦略型', 'onb_think=戦略型'),
    qrPostback('分析型', 'onb_think=分析型'),
    qrPostback('直感型', 'onb_think=直感型'),
    qrPostback('共感型', 'onb_think=共感型'),
    qrPostback('わからない', 'onb_think=未選択'),
  ];
}

/**
 * Build the "I understand you" message as a short, hand-written-feeling letter,
 * not a bullet list. Uses the user's exact wording so it doesn't feel template-filled.
 * Closes with humility ("もし違っていたら教えてください") so AXEL doesn't sound know-it-all.
 */
function buildTrustContractMessage(a: OnboardingAnswers): string {
  // The "I understand you" message — close, intimate, like a letter from a trusted friend.
  // No 様, minimal 敬語, the tone of someone who already knows you a little.
  const honor = a.name ? `${a.name}さん` : '';
  const lines: string[] = [];

  if (honor) {
    lines.push(`${honor}、話してくれてありがとう。`);
  } else {
    lines.push('話してくれてありがとう。');
  }
  lines.push('');

  const understanding: string[] = [];
  if (a.thinkingStyle && a.thinkingStyle !== '未選択') {
    understanding.push(`${a.thinkingStyle}で物事を見るタイプ`);
  }
  if (a.decisionTheme) {
    understanding.push(`いまは「${a.decisionTheme}」が頭にある`);
  }
  if (understanding.length > 0) {
    const subject = honor || 'あなた';
    lines.push(`${understanding.join('、')}──そんな${subject}のこと、しっかり覚えておく。`);
  } else if (honor) {
    lines.push(`これから${honor}のこと、もっと知っていきたい。`);
  } else {
    lines.push('これからあなたのこと、もっと知っていきたい。');
  }
  lines.push('');

  lines.push('迷った時、判断に困った時、体調が気になる時、');
  lines.push('いつでも声をかけてほしい。');
  lines.push('押し付けず、近くで一緒に考えるから。');
  lines.push('');

  lines.push('もし私の理解が違っていたら、遠慮なく教えてね。');
  lines.push('');
  lines.push('AXEL');

  return lines.join('\n');
}

function buildPostOnboardingHint(): string {
  // Short, casual, close.
  return '気になることがあれば、いつでも話しかけて。\n下のメニューも使いやすい時に使ってね。';
}

/**
 * Persist a button/follow-initiated exchange to the conversation history.
 * Without this, AXEL's opener（「最近は睡眠も気にしてたよね。眠れてる?」）never
 * reaches lineMessage, so on the user's NEXT message the model cannot see
 * the question it just asked — context breaks at exactly the moment the
 * proactive opener lands.
 */
async function persistLineExchange(
  lineUserId: string,
  userDisplayText: string | null,
  assistantText: string,
): Promise<void> {
  try {
    const lu = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lu) return;
    let conv = await prisma.lineConversation.findFirst({
      where: { lineUserId: lu.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!conv) {
      conv = await prisma.lineConversation.create({
        data: { lineUserId: lu.id, service: lu.userMode },
      });
    }
    if (userDisplayText) {
      await prisma.lineMessage.create({
        data: { conversationId: conv.id, sender: 'USER', content: userDisplayText },
      });
    }
    await prisma.lineMessage.create({
      data: { conversationId: conv.id, sender: 'ASSISTANT', content: assistantText },
    });
  } catch (err) {
    console.error('[LINE] persistLineExchange failed (non-fatal):', err);
  }
}

/** Start onboarding from scratch — wipes existing onboarding answers.
 *  Sends the warm 3-message intro then waits for the user to type their name. */
async function startOnboarding(lineUserId: string, replyToken: string, lineDisplayName: string | null = null): Promise<void> {
  setConversationState(lineUserId, { phase: 'ONBOARDING_NAME', onboarding: {} });
  const msgs = FOLLOW_INTRO_MESSAGES(lineDisplayName);
  await lineClient.replyMessage({
    replyToken,
    messages: msgs.slice(0, 5).map((text) => ({ type: 'text', text })),
  });
}

// ── Daily-log state machine ──

function dailyLogStateQuickReply(): line.QuickReplyItem[] {
  return [
    qrPostback('とても良い', 'log_state=1'),
    qrPostback('良い',       'log_state=2'),
    qrPostback('普通',       'log_state=3'),
    qrPostback('重い',       'log_state=4'),
    qrPostback('とても重い', 'log_state=5'),
  ];
}

function dailyLogFatigueQuickReply(): line.QuickReplyItem[] {
  return [
    qrPostback('なし',     'log_fatigue=1'),
    qrPostback('少しある', 'log_fatigue=2'),
    qrPostback('普通',     'log_fatigue=3'),
    qrPostback('強い',     'log_fatigue=4'),
    qrPostback('非常に強い','log_fatigue=5'),
  ];
}

// ── Status flex message (in-LINE "今の私") ──
//
// Narrative format, not dashboard. AXEL speaks ABOUT the user in second person —
// "今の○○様は…" — based on what's actually been recorded. If little data exists,
// the card explains that gracefully rather than showing blank fields.

async function buildStatusFlex(lineUserId: string, dbLineUserId: string): Promise<any> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [todayLog, weekLogs, lastAssistantMsg] = await Promise.all([
    prisma.dailyLog.findFirst({
      where: { lineUserId, logDate: { gte: todayStart } },
      orderBy: { logDate: 'desc' },
    }),
    prisma.dailyLog.findMany({
      where: { lineUserId, logDate: { gte: sevenDaysAgo } },
      orderBy: { logDate: 'desc' },
      take: 7,
    }),
    prisma.lineMessage.findFirst({
      where: { sender: 'ASSISTANT', conversation: { lineUserId: dbLineUserId } },
      orderBy: { createdAt: 'desc' },
      select: { content: true, createdAt: true },
    }),
  ]);

  // Parse today's record (if any).
  let todayState: number | null = null;
  let todayFatigue: number | null = null;
  let todayMemo: string | null = null;
  if (todayLog?.condition?.startsWith('JSON:')) {
    try {
      const p = JSON.parse(todayLog.condition.slice(5)) as Record<string, unknown>;
      todayState = typeof p.stateLevel === 'number' ? p.stateLevel : null;
      todayFatigue = typeof p.fatigueLevel === 'number' ? p.fatigueLevel : null;
      todayMemo = typeof p.comment === 'string' ? p.comment : (todayLog.memo ?? null);
    } catch { /* ignore */ }
  } else if (todayLog) {
    todayMemo = todayLog.memo ?? null;
  }

  // Compose a narrative observation — close, intimate tone (like a friend, not a butler).
  const a = getOnboardingAnswers(lineUserId);
  const honor = a?.name ? `${a.name}さん` : '';
  let observation: string;
  if (todayState != null && todayState >= 4) {
    observation = `今日はちょっと重そうだね。\n無理せず、急ぎじゃない判断は明日に持ち越していいと思う。`;
  } else if (todayFatigue != null && todayFatigue >= 4) {
    observation = `疲労が出てるみたいだね。\n重要な意思決定は一晩寝かせた方が安心かも。`;
  } else if (todayState != null && todayState <= 2) {
    observation = `今日は調子良さそうで嬉しい。\n長期視座が必要な判断、進めるにはいいタイミングかも。`;
  } else if (todayLog) {
    observation = `今日の様子、教えてくれてありがとう。\n気になることがあれば、いつでも話して。`;
  } else if (weekLogs.length === 0) {
    const subject = honor || 'あなた';
    observation = `${subject}と話せてない期間が続いてるね。\n何かあれば、いつでも声かけて。`;
  } else {
    observation = '今日はまだ話せてないね。\n「一言だけ」から、近況を一言教えてくれると嬉しい。';
  }

  // Last AXEL reply snippet (without prefix).
  const lastReplySnippet = lastAssistantMsg?.content
    ? lastAssistantMsg.content.replace(/【AXEL】/g, '').trim().slice(0, 80)
    : null;

  // Past-week activity summary.
  const activityLine = weekLogs.length > 0
    ? `この一週間で ${weekLogs.length} 回、近況をお聞きしました。`
    : 'この一週間、特に変調のお話はありません。';

  return {
    type: 'flex',
    altText: `${honor}の今の状態`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1E3A5F',
        paddingAll: '18px',
        contents: [
          { type: 'text', text: 'AXEL', color: '#C9A86A', size: 'sm', weight: 'bold', tracking: 'lg' },
          { type: 'text', text: `${honor}の今`, color: '#FFFFFF', size: 'xl', weight: 'bold', margin: 'sm' },
          {
            type: 'text',
            text: new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
            color: '#FFFFFFAA',
            size: 'xs',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'lg',
        paddingAll: '18px',
        contents: [
          // Observation paragraph — concierge's voice
          {
            type: 'text',
            text: observation,
            color: '#333333',
            size: 'sm',
            wrap: true,
          },
          ...(todayMemo
            ? [
                { type: 'separator' as const, margin: 'md' as const },
                {
                  type: 'text' as const,
                  text: 'ご記録いただいたメモ',
                  color: '#C9A86A',
                  size: 'xxs' as const,
                  weight: 'bold' as const,
                  margin: 'md' as const,
                  tracking: 'md' as const,
                },
                {
                  type: 'text' as const,
                  text: `「${todayMemo.slice(0, 100)}」`,
                  color: '#555555',
                  size: 'sm' as const,
                  wrap: true,
                  margin: 'sm' as const,
                },
              ]
            : []),
          ...(lastReplySnippet
            ? [
                { type: 'separator' as const, margin: 'md' as const },
                {
                  type: 'text' as const,
                  text: '前回お伝えしたこと',
                  color: '#C9A86A',
                  size: 'xxs' as const,
                  weight: 'bold' as const,
                  margin: 'md' as const,
                  tracking: 'md' as const,
                },
                {
                  type: 'text' as const,
                  text: lastReplySnippet,
                  color: '#666666',
                  size: 'sm' as const,
                  wrap: true,
                  margin: 'sm' as const,
                },
              ]
            : []),
          { type: 'separator', margin: 'md' },
          {
            type: 'text',
            text: activityLine,
            color: '#999999',
            size: 'xs',
            wrap: true,
            margin: 'md',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'sm',
        paddingAll: '14px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#1E3A5F',
            action: { type: 'postback', label: '相談する', data: 'open_chat', displayText: '相談したいことがあります' },
          },
          {
            type: 'button',
            style: 'secondary',
            action: { type: 'postback', label: '一言だけ記録', data: 'daily_log_start', displayText: '今日の調子を記録します' },
          },
        ],
      },
    },
  };
}

// ── Settings Quick Reply (in-LINE only) ──
function settingsQuickReply(currentMode: string, pushEnabled: boolean): line.QuickReplyItem[] {
  const items: line.QuickReplyItem[] = [];
  // AXEL (integrated) users never see mode-split options: AXEL covers both
  // domains in one persona, and ExecuWell/VitaAI stay backstage (client
  // 2026-07-07). Tapping a mode item would also silently downgrade the
  // integrated experience — a trap, not a setting.
  if (currentMode !== 'AXEL') {
    if (currentMode !== 'EXECUWELL') items.push(qrPostback('判断モードに', 'setting_mode=EXECUWELL'));
    if (currentMode !== 'VITAAI') items.push(qrPostback('健康モードに', 'setting_mode=VITAAI'));
  }
  items.push(qrPostback(pushEnabled ? '朝の通知をOFFに' : '朝の通知をONに', `setting_push=${!pushEnabled}`));
  items.push(qrPostback('プロフィールを再ヒアリング', 'setting_reonboard'));
  return items;
}

// ── Mode selection quick reply ──

const MODE_SELECT_TEXT =
  'AXEL へようこそ。\n判断力と健康を統合的に支える AI コンシェルジュです。\n\n' +
  '【ご利用の流れ】\n' +
  '① モードを選択（下のボタン）\n' +
  '② チャットで質問を送る／カルテで記録する\n' +
  '③ AIが、あなたの思考特性・体質・直近ログを横断した応答を返します\n\n' +
  'まずはご希望のモードをお選びください（あとから切替可能）。';

const MODE_QUICK_ITEMS: line.QuickReplyItem[] = [
  {
    type: 'action',
    action: {
      type: 'postback',
      label: 'AXEL（統合モード）',
      data: 'select_mode=AXEL',
      displayText: 'AXEL（統合モード）で使う',
    },
  },
  {
    type: 'action',
    action: {
      type: 'postback',
      label: 'ExecuWell（判断支援）',
      data: 'select_mode=EXECUWELL',
      displayText: 'ExecuWell を使う',
    },
  },
  {
    type: 'action',
    action: {
      type: 'postback',
      label: 'VitaAI（健康支援）',
      data: 'select_mode=VITAAI',
      displayText: 'VitaAI を使う',
    },
  },
];

// ── Effective mode resolution ──
// AXEL is computed at request time from active subscription, so no schema migration is needed.
// Resolution order:
//   1. INTEGRATED subscription + ACTIVE → AXEL (regardless of stored userMode)
//   2. Otherwise → stored LineUser.userMode (EXECUWELL or VITAAI)
//   3. Explicit override via lineUser.userMode === 'AXEL' string is also honored
//      (stored as raw string when chosen via onboarding postback).
export async function resolveEffectiveMode(
  lineUser: { id: string; userMode: string; appUserId: string | null },
): Promise<'AXEL' | 'EXECUWELL' | 'VITAAI'> {
  // If userMode was explicitly set to AXEL via postback, honor it
  if ((lineUser.userMode as string) === 'AXEL') return 'AXEL';

  // If the linked app user has an active INTEGRATED subscription, escalate to AXEL
  if (lineUser.appUserId) {
    try {
      const sub = await prisma.stripeSubscription.findFirst({
        where: {
          userId: lineUser.appUserId,
          status: 'ACTIVE',
          subscriptionType: 'INTEGRATED',
        },
        select: { id: true },
      });
      if (sub) return 'AXEL';
    } catch (err) {
      console.error('[LINE] resolveEffectiveMode subscription lookup failed:', err);
    }
  }

  // Fallback to stored single-mode preference
  return (lineUser.userMode === 'VITAAI' ? 'VITAAI' : 'EXECUWELL');
}

// ── Core event handler ──

export async function handleLineEvent(event: line.WebhookEvent): Promise<void> {
  // Only handle message and postback events
  if (event.type === 'follow') {
    console.log('[LINE] Handling follow event');
    return handleFollow(event as line.FollowEvent);
  }
  if (event.type === 'postback') {
    console.log('[LINE] Handling postback event');
    return handlePostback(event as line.PostbackEvent);
  }
  if (event.type === 'message' && (event as line.MessageEvent).message.type === 'text') {
    const msg = ((event as line.MessageEvent).message as any).text;
    console.log(`[LINE] Handling text message: "${msg?.substring(0, 50)}..."`);
    return handleTextMessage(event as line.MessageEvent);
  }
  if (event.type === 'message' && (event as line.MessageEvent).message.type === 'image') {
    console.log('[LINE] Handling image message');
    return handleImageMessage(event as line.MessageEvent);
  }
  if (event.type === 'message' && (event as line.MessageEvent).message.type === 'audio') {
    console.log('[LINE] Handling audio message');
    return handleAudioMessage(event as line.MessageEvent);
  }
  console.log(`[LINE] Ignoring event type: ${event.type} / message: ${(event as any)?.message?.type}`);
}

// ── Follow (friend add) – also fetches LINE profile display name ──

async function handleFollow(event: line.FollowEvent): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId) return;

  // Attempt to fetch display name from LINE profile
  let displayName: string | null = null;
  try {
    const profile = await lineClient.getProfile(lineUserId);
    displayName = profile.displayName || null;
  } catch (err) {
    console.error('[LINE] Failed to fetch profile for', lineUserId, err);
  }

  await prisma.lineUser.upsert({
    where: { lineUserId },
    update: { displayName: displayName || undefined },
    create: { lineUserId, displayName },
  });

  if (!event.replyToken) return;

  // ── Conversation-first onboarding ──
  // No forced question form. AXEL introduces itself in a single warm message,
  // then asks one open question. Profile is learned naturally from there.
  const greeting = await respondAsAxel({
    kind: 'first_greeting',
    lineUserId,
    lineDisplayName: displayName,
  });
  // The client's guaranteed how-to-use line — sent as a fixed second message so
  // it always appears (independent of the LLM greeting / any outage).
  const usageGuide =
    'このトーク画面から、いつでもそのまま話しかけてください。\n文字・画像・音声でご利用いただけます。';
  try {
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        { type: 'text', text: greeting.slice(0, 5000) },
        { type: 'text', text: usageGuide },
      ],
    });
  } catch (replyErr) {
    // Fall back to push if the reply token was consumed/expired
    await pushText(lineUserId, greeting).catch(() => {});
    await pushText(lineUserId, usageGuide).catch(() => {});
  }
  await persistLineExchange(lineUserId, null, greeting);
}

// ── Postback (button tap) ──

async function handlePostback(event: line.PostbackEvent): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId || !event.replyToken) return;

  const data = event.postback.data;

  // ─── Onboarding postback chains ─────────────────────────────────────────
  // Q3 (last): thinking style → COMPLETE onboarding, send trust contract
  if (data.startsWith('onb_think=')) {
    const thinkingStyle = data.replace('onb_think=', '');
    const next = updateConversationState(lineUserId, {
      phase: 'ONBOARDING_COMPLETED',
      onboarding: { thinkingStyle, completedAt: new Date().toISOString() },
      trustContractSentAt: new Date().toISOString(),
    });
    // Mark morning push as OFF by default — the client explicitly said users
    // don't want daily push, only a presence they can call on. Push is opt-in.
    try {
      await prisma.lineUser.update({
        where: { lineUserId },
        data: { morningPushEnabled: false },
      });
    } catch (err) {
      console.error('[LINE] Failed to disable morning push on onboarding complete:', err);
    }
    const trust = buildTrustContractMessage(next.onboarding ?? {});
    await lineClient.replyMessage({
      replyToken: event.replyToken,
      messages: [
        { type: 'text', text: trust },
        { type: 'text', text: buildPostOnboardingHint() },
      ],
    });
    return;
  }

  // Re-onboarding from settings — intentional full reset, then the
  // conversational greeting restarts learning. (The old startOnboarding
  // path set phase ONBOARDING_NAME which no handler consumes — dead end.)
  if (data === 'setting_reonboard') {
    clearConversationState(lineUserId);
    const reply = await respondAsAxel({ kind: 'first_greeting', lineUserId });
    await replyText(event.replyToken, reply);
    return;
  }

  // ─── Rich menu postbacks ─────────────────────────────────────────────────
  // Each rich menu button is now a "conversation starter". The button itself
  // doesn't open a feature — it just tells the AXEL engine what kind of
  // opening to use. AXEL handles everything else as natural conversation.

  const persistExchange = (userDisplayText: string | null, assistantText: string) =>
    persistLineExchange(lineUserId, userDisplayText, assistantText);

  // ── Any postback that starts a NEW conversational intent should clear a
  //    stale DAILY_LOG_MEMO phase. Otherwise a user who taps 一言だけ, then
  //    immediately taps 話したい, would have their next substantive text
  //    routed as a check-in memo instead of a real consultation. ──
  const clearStaleCheckIn = () => {
    const cur = getConversationState(lineUserId);
    // Phase-only reset. NEVER clearConversationState here — that deletes the
    // whole understanding document (13-item profile, prefs, notes).
    if (cur?.phase === 'DAILY_LOG_MEMO') clearTransientPhase(lineUserId);
  };

  if (data === 'open_chat') {
    // 相談する — AXEL receives you, general focus (no topic bias)
    clearStaleCheckIn();
    const reply = await respondAsAxel({ kind: 'open_chat_shortcut', lineUserId, focus: 'general' });
    await replyText(event.replyToken, reply);
    await persistExchange('相談したい', reply);
    return;
  }

  if (data === 'open_chat_health') {
    // 健康について相談する — pre-select health framing
    clearStaleCheckIn();
    const reply = await respondAsAxel({ kind: 'open_chat_shortcut', lineUserId, focus: 'health' });
    await replyText(event.replyToken, reply);
    await persistExchange('健康について相談したい', reply);
    return;
  }

  if (data === 'open_chat_judgment') {
    // 判断について相談する — pre-select judgment framing
    clearStaleCheckIn();
    const reply = await respondAsAxel({ kind: 'open_chat_shortcut', lineUserId, focus: 'judgment' });
    await replyText(event.replyToken, reply);
    await persistExchange('判断について相談したい', reply);
    return;
  }

  if (data === 'daily_log_start') {
    // 今日の状態を確認する — AXEL asks "today how are you" naturally, no QR form
    // We mark a soft "expecting check-in" phase so the next user text is
    // also saved as a daily log memo (but the conversation is fully open).
    updateConversationState(lineUserId, { phase: 'DAILY_LOG_MEMO', dailyLog: {} });
    const reply = await respondAsAxel({ kind: 'check_in_shortcut', lineUserId });
    await replyText(event.replyToken, reply);
    await persistExchange('今日の状態を確認したい', reply);
    return;
  }

  // Legacy "show_status" (今の私) — no longer in rich menu but preserved for
  // any legacy postback source (e.g. old Flex cards, deep links).
  if (data === 'show_status') {
    clearStaleCheckIn();
    const reply = await respondAsAxel({ kind: 'reflection_request', lineUserId });
    await replyText(event.replyToken, reply);
    await persistExchange(null, reply);
    return;
  }

  if (data === 'open_settings') {
    const lu = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lu) {
      await replyText(event.replyToken, 'まずは「相談する」からお話しを始めてください。');
      return;
    }
    // Resolve the EFFECTIVE mode: derived-AXEL users (INTEGRATED subscription,
    // stored userMode still EXECUWELL/VITAAI) must not see mode-split options.
    const effSettingsMode = await resolveEffectiveMode(lu);
    await replyWithQuickReply(
      event.replyToken,
      '設定したい項目を選んでください。',
      settingsQuickReply(effSettingsMode, lu.morningPushEnabled),
    );
    return;
  }

  if (data.startsWith('setting_mode=')) {
    const mode = data.replace('setting_mode=', '') as 'EXECUWELL' | 'VITAAI';
    if (mode !== 'EXECUWELL' && mode !== 'VITAAI') return;
    // Guard against stale quick-reply bubbles: an AXEL (integrated) user must
    // never be silently downgraded to a single mode.
    const luGuard = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (luGuard && (await resolveEffectiveMode(luGuard)) === 'AXEL') {
      await replyText(
        event.replyToken,
        '切り替えは必要ないよ。判断のことも健康のことも、私がまとめて受け持ってる。\nそのまま話しかけて。',
      );
      return;
    }
    await prisma.lineUser.upsert({
      where: { lineUserId },
      update: { userMode: mode },
      create: { lineUserId, userMode: mode },
    });
    const label = mode === 'EXECUWELL' ? '判断のサポート' : '健康のサポート';
    await replyText(
      event.replyToken,
      `${label}を中心にお応えするモードに変更しました。\n` +
      '統合プランをご契約の場合は、判断と健康を1つの応答で統合します。\n' +
      'お話を続けるには、そのままメッセージを送ってください。',
    );
    return;
  }

  if (data.startsWith('setting_push=')) {
    const enabled = data === 'setting_push=true';
    await prisma.lineUser.upsert({
      where: { lineUserId },
      update: { morningPushEnabled: enabled },
      create: { lineUserId, morningPushEnabled: enabled },
    });
    await replyText(
      event.replyToken,
      enabled
        ? '朝の通知を ON にしました。お身体に変調があれば、こちらから短くお声かけします。'
        : '朝の通知を OFF にしました。AXEL からの能動的な接触は控えめにします。',
    );
    return;
  }

  // ─── Legacy mode-select (preserved for back-compat) ──────────────────────
  if (data.startsWith('select_mode=')) {
    const mode = data.replace('select_mode=', '');
    if (mode !== 'EXECUWELL' && mode !== 'VITAAI' && mode !== 'AXEL') return;

    if (mode === 'AXEL') {
      // AXEL is derived from an active INTEGRATED subscription via resolveEffectiveMode.
      // For INTEGRATED users we preserve their existing single-mode preference
      // (so that if they ever cancel INTEGRATED, their previous focus mode is intact).
      // For non-INTEGRATED users we fall back to EXECUWELL.
      const lu = await prisma.lineUser.findUnique({
        where: { lineUserId },
        include: { appUser: true },
      });
      let hasIntegrated = false;
      if (lu?.appUserId) {
        const sub = await prisma.stripeSubscription.findFirst({
          where: { userId: lu.appUserId, status: 'ACTIVE', subscriptionType: 'INTEGRATED' },
          select: { id: true },
        });
        hasIntegrated = !!sub;
      }

      if (hasIntegrated) {
        // Don't touch userMode — keep prior preference; AXEL is auto-derived.
        if (!lu) {
          await prisma.lineUser.create({ data: { lineUserId } });
        }
        await replyText(
          event.replyToken,
          '【AXEL】モードに設定しました。\n\n' +
          'AXEL は、あなたの「判断」と「健康」を1人のコンシェルジュが統合的に支えます。\n' +
          '思考特性（MBTI/DISC）／遺伝子傾向／直近のログを横断した、1つの応答をお返しします。\n\n' +
          '──── 試しに送ってみてください ────\n' +
          '・「明日の取締役会、どう臨むべきか？」\n' +
          '・「最近、午後の判断が鈍る。原因は？」\n' +
          '・「組織拡大期の優先順位を整理したい」\n\n' +
          'メニューの「相談する」から、いつでも話せます。',
        );
      } else {
        // No subscription yet — set EXECUWELL as a sane fallback so chat works,
        // and direct user to the subscription page.
        await prisma.lineUser.upsert({
          where: { lineUserId },
          update: { userMode: 'EXECUWELL' },
          create: { lineUserId, userMode: 'EXECUWELL' },
        });
        await replyText(
          event.replyToken,
          'AXEL モード（統合）は「統合プラン」契約者向けです。\n' +
          'まずは ExecuWell モード（判断支援）でお試しいただけます。\n\n' +
          '──── ExecuWell でできること ────\n' +
          '・経営判断を整理する（結論／理由／リスク／推奨アクションで返却）\n' +
          '・思考特性に合わせたコミュニケーションスタイル\n\n' +
          '統合プラン申込：https://execuwell.jp/subscription',
        );
      }
      return;
    }

    await prisma.lineUser.upsert({
      where: { lineUserId },
      update: { userMode: mode },
      create: { lineUserId, userMode: mode },
    });

    if (mode === 'EXECUWELL') {
      await replyText(
        event.replyToken,
        'ExecuWell モード（判断支援）に設定しました。\n\n' +
        '──── 試しに送ってみてください ────\n' +
        '・「事業方針の優先順位を整理したい」\n' +
        '・「新規施策のリスクを洗い出してほしい」\n' +
        '・「会議で詰まった論点を構造化したい」\n\n' +
        'メニューの「判断の相談」から、いつでも話せます。',
      );
    } else {
      await replyText(
        event.replyToken,
        'VitaAI モード（健康支援）に設定しました。\n\n' +
        '──── まずは1日3秒の記録から ────\n' +
        '・メニューの「今日の状態」から、コンディションを一言残してください。\n' +
        '・記録が3日たまると、体質傾向と組み合わせた具体的な行動提案を返します。\n\n' +
        '・「最近疲れが翌日まで残る」など、気になる症状もそのまま送ってください。\n' +
        '遺伝子検査の結果がカルテに反映されると、提案の精度がさらに高まります。',
      );
    }
    return;
  }

  // Handle mode switch
  if (data === 'switch_mode') {
    // AXEL (integrated) users never see the branded mode picker —
    // ExecuWell/VitaAI are backstage (client 2026-07-07).
    const lu = await prisma.lineUser.findUnique({ where: { lineUserId } });
    const effMode = lu ? await resolveEffectiveMode(lu) : 'EXECUWELL';
    if (effMode === 'AXEL') {
      await replyText(
        event.replyToken,
        '切り替えは必要ないよ。判断のことも健康のことも、私がまとめて受け持ってる。\nそのまま話しかけて。',
      );
      return;
    }
    await replyWithQuickReply(event.replyToken, 'サービスを切り替えます。', MODE_QUICK_ITEMS);
    return;
  }
}

// ── Text message handler ──
//
// Routing order:
//   1) Slash commands (/switch, /help, 設定, /reonboard)
//   2) Active state-machine phase (daily-log capture → check_in_reply)
//   3) AI chat (the normal case). The v2 engine sends the raw message with
//      the full understanding document — the model itself judges casual vs
//      consultation vs meta. (If OpenAI fails the engine returns
//      AXEL_OUTAGE_NOTICE — an explicit problem notification. The old
//      axelFallback template layer is no longer sent, per client
//      direction 2026-07-20.)

async function handleTextMessage(event: line.MessageEvent): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId || !event.replyToken) return;

  const msg = ((event.message as any).text as string)?.trim();
  if (!msg) return;

  // ── Slash commands (utility, kept minimal) ──
  if (msg === '/help' || msg === 'ヘルプ') {
    await replyText(
      event.replyToken,
      'メニューはこんな感じで使えるよ。\n\n' +
      '相談する      ：話したいこと、なんでも\n' +
      '健康の相談    ：体調・睡眠・疲労・食事など\n' +
      '判断の相談    ：経営判断・組織・戦略など\n' +
      '今日の状態    ：今日の調子を一言\n\n' +
      '通知や表示の切替は「設定」と送ってね。\n' +
      'もちろん、メニューを使わず直接話しかけてくれて大丈夫。',
    );
    return;
  }
  // Settings — reachable via text since it's no longer in the rich menu.
  if (msg === '設定' || msg === '/settings' || msg === '/setting' || msg === '/config') {
    let lu = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lu) {
      lu = await prisma.lineUser.create({ data: { lineUserId } });
    }
    // Use the EFFECTIVE mode so derived-AXEL users (INTEGRATED subscription)
    // never see mode-split options, and first/subsequent 設定 render the same.
    const effSettingsMode = await resolveEffectiveMode(lu);
    await replyWithQuickReply(
      event.replyToken,
      '設定したい項目を選んで。',
      settingsQuickReply(effSettingsMode, lu.morningPushEnabled),
    );
    return;
  }
  if (msg === '/reonboard' || msg === 'プロフィール再設定') {
    clearConversationState(lineUserId);
    const reply = await respondAsAxel({ kind: 'first_greeting', lineUserId });
    await replyText(event.replyToken, reply);
    return;
  }
  if (msg === '/switch' || msg === 'サービス切替') {
    // AXEL (integrated) users never see the branded mode picker —
    // ExecuWell/VitaAI are backstage (client 2026-07-07).
    const luSwitch = await prisma.lineUser.findUnique({ where: { lineUserId } });
    const effMode = luSwitch ? await resolveEffectiveMode(luSwitch) : 'EXECUWELL';
    if (effMode === 'AXEL') {
      await replyText(
        event.replyToken,
        '切り替えは必要ないよ。判断のことも健康のことも、私がまとめて受け持ってる。\nそのまま話しかけて。',
      );
      return;
    }
    await replyWithQuickReply(event.replyToken, 'モードを切り替えます。', MODE_QUICK_ITEMS);
    return;
  }

  // ── Rate limit ──
  if (!checkLineRateLimit(lineUserId)) {
    await replyText(event.replyToken, 'ちょっとだけ待って、続けて話そう。');
    return;
  }

  // ── Ensure LINE user exists ──
  let lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
  if (!lineUser) {
    lineUser = await prisma.lineUser.create({ data: { lineUserId } });
  }

  // ── Ensure conversation row exists (for history persistence) ──
  let conv = await prisma.lineConversation.findFirst({
    where: { lineUserId: lineUser.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!conv) {
    conv = await prisma.lineConversation.create({
      data: { lineUserId: lineUser.id, service: lineUser.userMode },
    });
  }

  // ── Save user message ──
  await prisma.lineMessage.create({
    data: { conversationId: conv.id, sender: 'USER', content: msg },
  });

  // ── Special handling: if the user is in a soft "check-in expected" phase
  // (just tapped 一言だけ), save the natural-language input as a daily log
  // memo, then respond via the `check_in_reply` engine kind — this receives
  // the check-in AND bridges to further conversation. Client feedback:
  // 「一言だけ が体調入力で終わってしまい、その先の価値が見えない」への対応。
  //
  // BUT: if the user's text is clearly a substantive consultation (not a
  // mood/state report), we should NOT force it into the check-in framing.
  // A user who taps 一言だけ, changes their mind, and types "資金調達で
  // 悩んでいます" deserves a real consultation response, not a
  // check-in bridge.
  const state = getConversationState(lineUserId);
  const inCheckInPhase = state?.phase === 'DAILY_LOG_MEMO';

  // Heuristic: does this text look like a mood/state one-liner, or a topic?
  // Short mood text: 「疲れた」「今日は良い感じ」「普通」「まあまあ」etc
  // Topic text: 「資金調達で悩んでいます」etc (long, or contains consultation markers)
  const looksLikeMoodReport =
    msg.length <= 40 ||
    /^(疲れ|しんど|きつい|眠い|だる|忙し|元気|調子|普通|まあまあ|良い|悪い|重い|軽い|大丈夫|なし|特に|そこそこ|ぼちぼち)/.test(msg);
  const looksLikeConsultation =
    /(悩んで|迷って|考えて|相談|判断|決めた|決めない|検討|意思決定|投資家|調達|組織|拡大|ピボット|転換|承継|提携|離職|退任|M&A|買収|売却|辞任|人事|話したい|話がある|聞いてほしい|聞いて欲しい)/.test(msg);

  const wasCheckInReply = inCheckInPhase && looksLikeMoodReport && !looksLikeConsultation;

  if (inCheckInPhase) {
    // Only a genuine mood/state report becomes a daily-log memo. A user who
    // taps 一言だけ and then pivots to a consultation should not have that
    // consultation text polluting their health log.
    if (wasCheckInReply) {
      const memo = msg === 'なし' ? null : msg.slice(0, 500);
      await prisma.dailyLog.create({
        data: {
          lineUserId,
          condition: null,
          memo,
          logDate: new Date(),
        },
      });
    }
    // Either way the check-in phase is consumed — phase-only reset; the
    // understanding document (profile/prefs/notes) must survive check-ins.
    clearTransientPhase(lineUserId);
  }

  // ── Show LINE's native typing indicator INSTEAD of a placeholder text ──
  // Client feedback (2026-07-04): 「少々お待ちください…」が「システムと会話
  // している」印象を作る。Loading Animation は LINE 純正の「入力中」表示で、
  // メッセージ履歴には残らず、より自然な体感になります。
  //
  // We do NOT reply to the event.replyToken up front anymore — instead we
  // hold on to it and use it for the actual AXEL response when ready.
  // If AXEL takes more than ~30s (rare), we fall back to pushText.
  try {
    await lineClient.showLoadingAnimation({
      chatId: lineUserId,
      // Deep-proposal answers take 15–25s on the flagship model; the
      // animation auto-clears the moment the reply arrives.
      loadingSeconds: 60,
    });
  } catch (loadErr) {
    // Loading animation is a nice-to-have; failure is not fatal
    console.warn('[LINE] showLoadingAnimation failed (non-fatal):', (loadErr as any)?.message || loadErr);
  }

  // ── Route through the unified AXEL response engine ──
  //
  // Behaviour: we prefer replyMessage (using the still-valid replyToken)
  // so AXEL's response is the immediate reply — no placeholder text.
  // The reply token is valid for ~60 seconds. If AXEL genuinely takes
  // longer OR the reply call fails (e.g. token already consumed), we
  // fall back to pushText.
  try {
    const reply = wasCheckInReply
      ? await respondAsAxel({ kind: 'check_in_reply', lineUserId, text: msg })
      : await respondAsAxel({ kind: 'text', lineUserId, text: msg });

    // Persist AXEL's reply for memory and learning
    await prisma.lineMessage.create({
      data: { conversationId: conv.id, sender: 'ASSISTANT', content: reply },
    });

    // First try replyMessage (single natural response, no preamble)
    let delivered = false;
    try {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: reply.slice(0, 5000) }],
      });
      delivered = true;
    } catch (replyErr: any) {
      // Reply token may have already been consumed or expired — fall back
      console.warn('[LINE] replyMessage failed, falling back to push:', replyErr?.message || replyErr);
    }
    if (!delivered) {
      await pushText(lineUserId, reply.slice(0, 5000));
    }
  } catch (err: any) {
    console.error('[LINE] Error in axelEngine:', err);
    try {
      // Try the reply-token path first for the error message too
      await lineClient
        .replyMessage({
          replyToken: event.replyToken,
          messages: [{ type: 'text', text: 'ごめん、一瞬うまく言葉が出てこなかった。もう一度、声をかけてもらえるかな。' }],
        })
        .catch(async () => {
          await pushText(
            lineUserId,
            'ごめん、一瞬うまく言葉が出てこなかった。もう一度、声をかけてもらえるかな。',
          );
        });
    } catch (pushErr) {
      console.error('[LINE] Failed to send error message to user:', pushErr);
    }
  }
}

// ── Image message handler (Vision, client spec 2) ──
//
// Fetches the image from LINE's content API, hands it to the unified AXEL
// engine as a multimodal turn, and delivers the personalized reply. What the
// image was about is persisted (via the engine's understanding pass) so later
// consultations can refer back to it.

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

// LINE delivers JPEG for photos. Cap the payload so a huge image can't blow up
// token cost / latency; gpt vision downsamples internally so this is ample.
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

async function handleImageMessage(event: line.MessageEvent): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId || !event.replyToken) return;
  const messageId = (event.message as any).id as string;
  if (!messageId) return;

  if (!checkLineRateLimit(lineUserId)) {
    await replyText(event.replyToken, 'ちょっとだけ待って、続けて話そう。');
    return;
  }

  // Ensure user + conversation rows (for history persistence)
  let lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
  if (!lineUser) lineUser = await prisma.lineUser.create({ data: { lineUserId } });
  let conv = await prisma.lineConversation.findFirst({
    where: { lineUserId: lineUser.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!conv) {
    conv = await prisma.lineConversation.create({
      data: { lineUserId: lineUser.id, service: lineUser.userMode },
    });
  }
  // Record that an image arrived, so conversation history reflects it.
  await prisma.lineMessage.create({
    data: { conversationId: conv.id, sender: 'USER', content: '[画像]' },
  });

  // Loading animation while we fetch + analyze
  try {
    await lineClient.showLoadingAnimation({ chatId: lineUserId, loadingSeconds: 60 });
  } catch (loadErr) {
    console.warn('[LINE] showLoadingAnimation failed (non-fatal):', (loadErr as any)?.message || loadErr);
  }

  // Fetch the image bytes from LINE
  let imageDataUri: string;
  try {
    const stream = await lineBlobClient.getMessageContent(messageId);
    const buf = await streamToBuffer(stream as any);
    if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
      const why = buf.length === 0 ? '画像をうまく受け取れなかった' : '画像のサイズが大きすぎて読み取れなかった';
      const reply = `ごめん、${why}みたい。もう一度送ってもらえるかな。`;
      await prisma.lineMessage.create({ data: { conversationId: conv.id, sender: 'ASSISTANT', content: reply } });
      await replyText(event.replyToken, reply).catch(() => pushText(lineUserId, reply));
      return;
    }
    imageDataUri = `data:image/jpeg;base64,${buf.toString('base64')}`;
  } catch (fetchErr: any) {
    console.error('[LINE] image fetch failed:', fetchErr?.message || fetchErr);
    const reply = 'ごめん、画像をうまく受け取れなかった。もう一度送ってもらえるかな。';
    await prisma.lineMessage.create({ data: { conversationId: conv.id, sender: 'ASSISTANT', content: reply } });
    await replyText(event.replyToken, reply).catch(() => pushText(lineUserId, reply));
    return;
  }

  // Route through the unified engine as an image turn
  try {
    const reply = await respondAsAxel({ kind: 'image', lineUserId, imageDataUri });
    await prisma.lineMessage.create({
      data: { conversationId: conv.id, sender: 'ASSISTANT', content: reply },
    });
    let delivered = false;
    try {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: reply.slice(0, 5000) }],
      });
      delivered = true;
    } catch (replyErr: any) {
      console.warn('[LINE] replyMessage failed, falling back to push:', replyErr?.message || replyErr);
    }
    if (!delivered) await pushText(lineUserId, reply.slice(0, 5000));
  } catch (err: any) {
    console.error('[LINE] Error in axelEngine (image):', err);
    const reply = 'ごめん、画像を見ようとしたら一瞬うまくいかなかった。もう一度送ってもらえるかな。';
    await lineClient
      .replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: reply }] })
      .catch(async () => { await pushText(lineUserId, reply); });
  }
}

// ── Audio message handler (Voice, client spec 3) ──
//
// Fetches the voice clip from LINE, transcribes it to text, then routes the
// transcript through the SAME text engine — so a spoken consultation gets the
// full understanding document, web search, and deep-proposal treatment, and
// the reply comes back as natural text.

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // OpenAI transcription upload ceiling

async function handleAudioMessage(event: line.MessageEvent): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId || !event.replyToken) return;
  const messageId = (event.message as any).id as string;
  if (!messageId) return;

  if (!checkLineRateLimit(lineUserId)) {
    await replyText(event.replyToken, 'ちょっとだけ待って、続けて話そう。');
    return;
  }

  // Ensure user + conversation rows
  let lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
  if (!lineUser) lineUser = await prisma.lineUser.create({ data: { lineUserId } });
  let conv = await prisma.lineConversation.findFirst({
    where: { lineUserId: lineUser.id },
    orderBy: { createdAt: 'desc' },
  });
  if (!conv) {
    conv = await prisma.lineConversation.create({
      data: { lineUserId: lineUser.id, service: lineUser.userMode },
    });
  }

  try {
    await lineClient.showLoadingAnimation({ chatId: lineUserId, loadingSeconds: 60 });
  } catch (loadErr) {
    console.warn('[LINE] showLoadingAnimation failed (non-fatal):', (loadErr as any)?.message || loadErr);
  }

  // Fetch + transcribe
  let transcript: string | null = null;
  try {
    const stream = await lineBlobClient.getMessageContent(messageId);
    const buf = await streamToBuffer(stream as any);
    if (buf.length > 0 && buf.length <= MAX_AUDIO_BYTES) {
      transcript = await transcribeAudio(buf, 'audio.m4a');
    }
  } catch (fetchErr: any) {
    console.error('[LINE] audio fetch failed:', fetchErr?.message || fetchErr);
  }

  if (!transcript) {
    const reply = 'ごめん、うまく聞き取れなかった。もう一度送ってもらうか、文字で教えてもらえるかな。';
    await prisma.lineMessage.create({ data: { conversationId: conv.id, sender: 'ASSISTANT', content: reply } });
    await replyText(event.replyToken, reply).catch(() => pushText(lineUserId, reply));
    return;
  }

  // Persist the transcript as the user turn (so history reflects what was said)
  await prisma.lineMessage.create({
    data: { conversationId: conv.id, sender: 'USER', content: transcript },
  });

  // Route the transcript through the unified engine as a normal text turn
  try {
    const reply = await respondAsAxel({ kind: 'text', lineUserId, text: transcript });
    await prisma.lineMessage.create({
      data: { conversationId: conv.id, sender: 'ASSISTANT', content: reply },
    });
    let delivered = false;
    try {
      await lineClient.replyMessage({
        replyToken: event.replyToken,
        messages: [{ type: 'text', text: reply.slice(0, 5000) }],
      });
      delivered = true;
    } catch (replyErr: any) {
      console.warn('[LINE] replyMessage failed, falling back to push:', replyErr?.message || replyErr);
    }
    if (!delivered) await pushText(lineUserId, reply.slice(0, 5000));
  } catch (err: any) {
    console.error('[LINE] Error in axelEngine (audio):', err);
    const reply = 'ごめん、一瞬うまく言葉が出てこなかった。もう一度、声をかけてもらえるかな。';
    await lineClient
      .replyMessage({ replyToken: event.replyToken, messages: [{ type: 'text', text: reply }] })
      .catch(async () => { await pushText(lineUserId, reply); });
  }
}

// pushText is exported above — morning push logic now lives in morningLineService.ts
