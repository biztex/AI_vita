import * as line from '@line/bot-sdk';
import { ENV } from '../env';
import { prisma } from '../prisma';
import { processChat } from './chatService';

// ── LINE SDK clients ──

const lineConfig: line.ClientConfig = {
  channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: ENV.LINE_CHANNEL_SECRET,
};

export const lineClient = new line.messagingApi.MessagingApiClient({
  channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
});

export { lineConfig };

// ── LINE-specific rate limiting (per lineUserId) ──
const lineRateLimits = new Map<string, { count: number; resetTime: number }>();
const LINE_RATE_WINDOW = 60 * 1000; // 1 minute
const LINE_RATE_MAX = 8; // Max messages per minute per LINE user

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

// ── Mode selection quick reply ──

const MODE_SELECT_TEXT =
  'グリースへようこそ！\nご利用になるサービスを選択してください。';

const MODE_QUICK_ITEMS: line.QuickReplyItem[] = [
  {
    type: 'action',
    action: {
      type: 'postback',
      label: 'ExecuWell（経営支援）',
      data: 'select_mode=EXECUWELL',
      displayText: 'ExecuWell を使う',
    },
  },
  {
    type: 'action',
    action: {
      type: 'postback',
      label: 'VitaAI（体調最適化）',
      data: 'select_mode=VITAAI',
      displayText: 'VitaAI を使う',
    },
  },
];

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
  console.log(`[LINE] Ignoring event type: ${event.type}`);
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

  // Create or update LineUser row (with display name)
  await prisma.lineUser.upsert({
    where: { lineUserId },
    update: { displayName: displayName || undefined },
    create: { lineUserId, displayName },
  });

  // Send mode selection
  if (!event.replyToken) return;
  await replyWithQuickReply(event.replyToken, MODE_SELECT_TEXT, MODE_QUICK_ITEMS);
}

// ── Postback (button tap) ──

async function handlePostback(event: line.PostbackEvent): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId || !event.replyToken) return;

  const data = event.postback.data;

  // Handle mode selection: select_mode=EXECUWELL or select_mode=VITAAI
  if (data.startsWith('select_mode=')) {
    const mode = data.replace('select_mode=', '');
    if (mode !== 'EXECUWELL' && mode !== 'VITAAI') return;

    await prisma.lineUser.upsert({
      where: { lineUserId },
      update: { userMode: mode },
      create: { lineUserId, userMode: mode },
    });

    const label = mode === 'EXECUWELL' ? 'ExecuWell' : 'VitaAI';
    await replyText(
      event.replyToken,
      `${label} モードに設定しました。\nなにか気になることがあれば、メッセージを送ってください！`,
    );
    return;
  }

  // Handle mode switch
  if (data === 'switch_mode') {
    await replyWithQuickReply(event.replyToken, 'サービスを切り替えます。', MODE_QUICK_ITEMS);
    return;
  }
}

// ── Text message → MyAI chat (with conversation memory + rate limit) ──

async function handleTextMessage(event: line.MessageEvent): Promise<void> {
  const lineUserId = event.source.userId;
  if (!lineUserId || !event.replyToken) return;

  const msg = ((event.message as any).text as string)?.trim();
  if (!msg) return;

  // ── Command handling ──

  // /switch – change service mode
  if (msg === '/switch' || msg === 'サービス切替') {
    await replyWithQuickReply(event.replyToken, 'サービスを切り替えます。', MODE_QUICK_ITEMS);
    return;
  }

  // /new – start a fresh conversation
  if (msg === '/new' || msg === '新しい会話' || msg === 'リセット') {
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (lineUser) {
      await prisma.lineConversation.create({
        data: { lineUserId: lineUser.id, service: lineUser.userMode },
      });
    }
    await replyText(event.replyToken, '新しい会話を始めましょう！\nなにか気になることはありますか？');
    return;
  }

  // /help – show available commands
  if (msg === '/help' || msg === 'ヘルプ') {
    await replyText(
      event.replyToken,
      '【使えるコマンド】\n' +
      '・サービス切替（/switch）\n' +
      '・新しい会話（/new）\n' +
      '・ヘルプ（/help）\n\n' +
      'それ以外のメッセージはMyAIが回答します。',
    );
    return;
  }

  // ── Rate limit check ──
  if (!checkLineRateLimit(lineUserId)) {
    await replyText(
      event.replyToken,
      'メッセージが多すぎます。少し待ってからもう一度お試しください。',
    );
    return;
  }

  // ── Reply immediately to avoid token expiration ──
  console.log(`[LINE] Sending quick reply to userId=${lineUserId.substring(0, 8)}...`);
  await replyText(event.replyToken, '考え中...');

  // ── Process in background and send via push ──
  try {
    console.log(`[LINE] Loading user and conversation for userId=${lineUserId.substring(0, 8)}...`);
    
    // ── Ensure LINE user exists ──
    let lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) {
      console.log(`[LINE] Creating new LINE user: ${lineUserId.substring(0, 8)}...`);
      lineUser = await prisma.lineUser.create({ data: { lineUserId } });
    }

    const service = lineUser.userMode; // EXECUWELL or VITAAI
    console.log(`[LINE] User mode: ${service}, appUserId: ${lineUser.appUserId || 'not linked'}`);

    // ── Get or create active LINE conversation ──
    let conv = await prisma.lineConversation.findFirst({
      where: { lineUserId: lineUser.id, service },
      orderBy: { createdAt: 'desc' },
    });
    if (!conv) {
      console.log(`[LINE] Creating new conversation for service: ${service}`);
      conv = await prisma.lineConversation.create({
        data: { lineUserId: lineUser.id, service },
      });
    }

    // ── Load conversation history (last 12 messages) for context ──
    const recentMessages = await prisma.lineMessage.findMany({
      where: { conversationId: conv.id },
      orderBy: { createdAt: 'asc' },
      take: 12,
    });
    let lineHistory = recentMessages.map((m) => ({
      role: (m.sender === 'USER' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    }));
    // EXECUWELL: send only last 2 exchanges (4 messages) to control tokens
    if (service === 'EXECUWELL') {
      lineHistory = lineHistory.slice(-4);
    }
    console.log(`[LINE] Loaded ${lineHistory.length} messages from conversation history`);

    // ── Save user message ──
    await prisma.lineMessage.create({
      data: { conversationId: conv.id, sender: 'USER', content: msg },
    });

    // ── Call MyAI (pass LINE history for conversation memory) ──
    console.log(`[LINE] Calling processChat for service=${service}, message length=${msg.length}`);
    const startTime = Date.now();
    const aiReply = await processChat(
      service,
      msg,
      lineUser.appUserId ?? undefined,
      undefined, // no web conversationId
      lineHistory,
    );
    const duration = Date.now() - startTime;
    console.log(`[LINE] processChat completed in ${duration}ms, reply length=${aiReply.length}`);

    // ── Save assistant reply ──
    await prisma.lineMessage.create({
      data: { conversationId: conv.id, sender: 'ASSISTANT', content: aiReply },
    });

    // ── Send reply via push (no token expiration issue) ──
    console.log(`[LINE] Sending AI reply via push message to userId=${lineUserId.substring(0, 8)}...`);
    await pushText(lineUserId, aiReply.slice(0, 5000));
    console.log(`[LINE] Successfully sent reply`);

  } catch (err: any) {
    console.error('[LINE] Error processing message:', err);
    // Send error message to user via push
    try {
      await pushText(
        lineUserId,
        '申し訳ありません。一時的なエラーが発生しました。\nしばらくしてからもう一度お試しください。',
      );
    } catch (pushErr) {
      console.error('[LINE] Failed to send error message to user:', pushErr);
    }
  }
}

// pushText is exported above — morning push logic now lives in morningLineService.ts
