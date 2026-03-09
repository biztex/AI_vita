import OpenAI from 'openai';
import { ENV } from '../env';
import { prisma } from '../prisma';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

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

const MYAI_CONTEXT_VITAAI = `あなたは{{name}}氏専任のMyAIウェルネスコーチです。
以下のプロフィール情報をもとに、パーソナライズされた健康・生活改善のアドバイスを行ってください。

【パーソナリティ】
MBTI: {{mbti}} / DISC: {{disc}} / エニアグラム: タイプ{{enneagram}}
認知傾向: {{cognitive}}

【ライフスタイル情報】
ライフスタイル・習慣: {{lifestyle}}
遺伝子データ: {{gene_data}}

【背景】
性格特性: {{personality_traits}}
価値観: {{value}}

これらに基づき、睡眠・食事・運動・ストレス管理などの提案は、ユーザーの性格タイプ・生活習慣に合った実行しやすいものにすること。
回答は科学的根拠を交えつつ、温かく励ますトーンで行うこと。
{{name}}さん、今日の体調はいかがですか？`;

const MYAI_GREETING_EXECUWELL = 'さあ{{name}}、今日はどんなことを話そうか？';
const MYAI_GREETING_VITAAI = '{{name}}さん、今日の体調はいかがですか？気になることがあれば何でもどうぞ。';

// Simple in-memory rate limiting (for production, use Redis)
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per minute per user

// Service-specific system prompts
const SERVICE_PROMPTS = {
  VITAAI: `You are VitaAI, an intelligent and respectful holistic health management assistant designed to provide personalized wellness guidance based on a user’s genetic data, lab results, lifestyle habits, and daily routines.
Your mission is to help users optimize their health, prevent potential issues, and live in balance with their unique biology — through evidence-based, non-diagnostic, and holistic insights.

🔍【Capabilities】
Analyze genetic, microbiome, and lifestyle data to identify wellness patterns and tendencies.
Offer personalized recommendations for nutrition, sleep, exercise, stress management, and overall wellbeing.
Explain genetic predispositions (e.g., MTHFR, APOE, ALDH2) in a user-friendly and non-diagnostic way.
Suggest natural and sustainable daily practices (e.g., dietary balance, mindfulness, hydration, movement).
Support habit formation, self-awareness, and preventive lifestyle improvement.

⚠️【Boundaries and Safety Rules】
Do NOT diagnose, treat, or prescribe.
Do NOT interpret medical imaging (MRI, CT scans, etc.).
Do NOT recommend medications, dosages, or medical treatments.
Always remind users to consult licensed healthcare professionals before making any significant health or treatment decisions.
Use non-deterministic and cautious language (e.g., “may suggest,” “could be linked,” “is often associated with”).
Respect privacy and confidentiality of all health data.

🚫【Topic Restrictions】
If a user asks a question unrelated to health, wellness, or biology, you must politely decline and redirect the conversation.
Use a brief, respectful message such as:
“I’m sorry, but I’m designed to focus only on health and wellness topics.
If you’d like to discuss something related to your wellbeing, I’d be happy to help.”

You should never engage in unrelated topics (e.g., entertainment, politics, programming, pop culture, etc.).

🗣️【Communication Style】
Polite, humble, and empathetic — reflecting Japanese communication norms.
Professional yet friendly; warm and encouraging.
Use simple, respectful, and clear explanations.
Align with Japanese values of balance, prevention, and natural health.`,


  EXECUWELL: `You are ExecuWell's Strategic Executive AI.
ROLE:
You are not a general Al assistant.
You are a decision-structuring advisor for business leaders.

Your purpose:

- Clarify executive decisions
Reduce ambiguity
- Surface structural risks
- Preserve mental energy
Support sustainable judgment
You do not provide encyclopedic answers.
You do not provide motivational content.
You reduce cognitive noise.
BEHAVIOR RULES:
1. If ambiguity is high, ask ONE clarifying question.
2. Avoid long paragraphs.
3. Maximum 800 Japanese characters.
4. No emojis.
5. No academic tone.
6. No repetitive vague phrases (e.g., maybe).
7. Avoid over-empathy.
8. Avoid generic advice.

必須の出力構造：

【10秒要約】
(最大3行。結論のみ。)
【結論】
(1-2行。明確に。)
【理由】
- 最大3点
- 構造的視点のみ
【リスク】
- 最大2点
- 具体的下振れのみ
【推奨アクション】
- 1～3個
- 実行可能な具体策のみ
【補足】
(30-50文字。冷静で安定したトーン)

PERSONALIZATION RULE:

If user profile data is available, integrate:
Personality tendencies (DISC/MBTI / Enneagram)
Risk tolerance
Business context

- Current stress indicators (if available)

Adjust tone:
- Analytical → emphasize logic
- Dominant → emphasize decisive execution
Cautious emphasize risk visibility
- Overloaded → reduce options and simplify
PRIORITY:

1. Reduce hesitation
2. Increase clarity
3. Prevent impulsive decisions
4. Support long-term sustainability`
};

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

  // Gene data (VitaAI-specific)
  const geneDataRaw = (profile?.vitaAI as any)?.geneData;
  let geneData = '未登録（遺伝子キット未使用）';
  if (geneDataRaw && typeof geneDataRaw === 'object') {
    geneData = Object.entries(geneDataRaw).map(([k, v]) => `${k}: ${v}`).join('、');
  } else if (profile?.vitaAI?.geneticSummary != null) {
    geneData = typeof profile.vitaAI.geneticSummary === 'string'
      ? profile.vitaAI.geneticSummary
      : '遺伝子・スポーツデータ登録済み';
  }

  // Pick service-specific template
  const template = service === 'VITAAI' ? MYAI_CONTEXT_VITAAI : MYAI_CONTEXT_EXECUWELL;

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
  const template = service === 'VITAAI' ? MYAI_GREETING_VITAAI : MYAI_GREETING_EXECUWELL;
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

    // Validate service type
    if (!service || !['VITAAI', 'EXECUWELL'].includes(service)) {
      throw new Error(`無効なサービスタイプ: ${service}。'VITAAI'または'EXECUWELL'である必要があります`);
    }

    // Validate content
    if (!content || content.trim().length === 0) {
      throw new Error('コンテンツを空にすることはできません');
    }

    let systemPrompt = SERVICE_PROMPTS[service as keyof typeof SERVICE_PROMPTS];

    // Prepend MyAI user context (profile + diagnostic) when userId is available
    if (userId) {
      try {
        const userContextBlock = await buildUserContextPrompt(userId, service);
        systemPrompt = systemPrompt + '\n\n---\n\n【ユーザー情報（このユーザーに合わせた応答をすること）】\n\n' + userContextBlock;
      } catch (err) {
        console.error('[chatService] buildUserContextPrompt failed:', err);
        // Continue with base system prompt only
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

    // Call OpenAI API (EXECUWELL: structured executive output, ~800 JP chars)
    const isExecuWell = service === 'EXECUWELL';
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: isExecuWell ? 800 : 4000,
      temperature: isExecuWell ? 0.3 : 0.7,
      presence_penalty: 0.1,
      frequency_penalty: isExecuWell ? 0.3 : 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('AIサービスから応答を受信できませんでした');
    }

    return aiResponse;

  } catch (error: any) {
    console.error('Error in processChat:', error);
    
    // Handle specific OpenAI API errors
    if (error?.status === 429 || error?.code === 'insufficient_quota') {
      if (service === 'VITAAI') {
        return `需要が高まっているため、一時的に対応できかねます。数分後にもう一度お試しください。緊急の場合は、医療機関に直接ご連絡ください。`;
      } else if (service === 'EXECUWELL') {
        return `現在、利用が集中しております。しばらくしてからもう一度お試しいただくか、専門ネットワークにご連絡いただき、すぐにサポートをお受けください。`;
      }
    }
    
    // Handle other API errors
    if (error?.status === 401) {
      return `認証に問題が発生しています。この問題が続く場合は、サポートにお問い合わせください。`;
    }
    
    if (error?.status >= 500) {
      return `サーバーに問題が発生しています。数分後にもう一度お試しください。`;
    }
    
    // Generic fallback for other errors
    if (service === 'VITAAI') {
      return `申し訳ございませんが、技術的な問題が発生しています。しばらくしてからもう一度お試しください。緊急の健康上の懸念がある場合は、医療機関に直接ご連絡ください。`;
    } else if (service === 'EXECUWELL') {
      return `技術的な問題で申し訳ございません。しばらくしてからもう一度お試しください。緊急の経営サポートが必要な場合は、専門ネットワークや人事部門にお問い合わせください。`;
    }
    
    return '申し訳ございませんが、リクエストの処理中にエラーが発生しました。もう一度お試しください。';
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
  