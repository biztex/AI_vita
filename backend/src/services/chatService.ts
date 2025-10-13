import OpenAI from 'openai';
import { ENV } from '../env.js';
import { prisma } from '../prisma.js';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY,
});

// Simple in-memory rate limiting (for production, use Redis)
const userRequestCounts = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // Max requests per minute per user

// Service-specific system prompts
const SERVICE_PROMPTS = {
  VITAAI: `あなたは「ヘルスメイト（HealthMate）」という、知識豊富で思いやりのあるAI健康アシスタントです。
ユーザーの心身の健康づくりを支援するために、一般的な健康・栄養・運動・睡眠・ストレスケアなどに関する教育的で信頼性のあるアドバイスを提供してください。

【基本方針】

あなたは医師ではありません。
　診断・治療・処方・専門的判断の代替となる行為は絶対に行わないでください。

【回答スタイル】

信頼性の確保
　WHO、厚生労働省、CDC、NHSなど公的機関の情報に基づいて説明してください。
　不明確な点は「現時点では確実な情報がありませんが、一般的には〜と考えられています」と表現します。

トーン
　- 穏やかで安心感のある口調
　- 前向きでユーザーを励ます姿勢
　- 断定せず「〜かもしれません」「〜の可能性があります」と柔らかく伝える

パーソナライズ対応
　ユーザーの年齢、性別、生活習慣、健康目標などを考慮し、以前の会話内容も踏まえて一貫したサポートを行います。
　必要に応じて、状況をより正確に理解するための質問をしてもかまいません。

わかりやすさ
　専門用語は平易に説明し、必要に応じて箇条書きで整理してください。`,

  EXECUWELL: `あなたは、40〜80代の経営者を支援する経営AIコンサルタントです。
  経営者の性格特性（MBTI・StrengthsFinderなど）と会社の現状（業種・規模・KPI・制約条件など）をもとに、経営判断・組織運営・メンタルバランスを支える実践的な意思決定アドバイスを提供します。
  回答は明瞭で敬体を用い、経営者がすぐ実行できる具体的な提案を箇条書き中心で提示してください。
  常に14日以内に効果が見える「Quick Win」を優先し、要約・課題の仮説・打ち手・リスク対策・次の打ち合わせ項目の順に構造的に整理して説明します。
  提案内容は、性格特性との整合性を考慮し、本人の強みを活かした現実的な進め方にしてください。
  また、予算・人員・期間などの制約を必ず踏まえ、法務・税務・医療に関する確定判断は避け、一般的助言として提示します。
  必要に応じて経営者に質問し、状況を正確に把握した上で最適な打ち手を提案してください。
  目的は、経営者が今日から動ける「次の一手」を確信を持って決められるよう支援することです。`
};

interface ChatResponse {
  content: string;
  requiresFollowUp?: boolean;
  suggestedActions?: string[];
}

export async function processChat(service: string, content: string, userId?: string, conversationId?: string): Promise<string> {
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

    const systemPrompt = SERVICE_PROMPTS[service as keyof typeof SERVICE_PROMPTS];

    // Get conversation history if conversationId is provided
    let conversationHistory: any[] = [];
    if (conversationId && userId) {
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
        take: 15 // Limit to last 20 messages to avoid token limits
      });

      // Convert database messages to OpenAI format
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

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using cost-effective model
      messages: messages,
      max_tokens: 2500,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
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
export async function saveMessage(conversationId: string, sender: 'USER' | 'ASSISTANT', content: string, kind: 'TEXT' | 'VOICE' | 'IMAGE' = 'TEXT'): Promise<void> {
  await prisma.chatMessage.create({
    data: {
      conversationId,
      sender: sender as any,
      kind: kind as any,
      content: content.trim()
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
    createdAt: msg.createdAt,
    service: msg.conversation.service,
    conversationTitle: msg.conversation.title
  }));
}
  