import OpenAI from 'openai';
import { ENV } from '../env';
import { prisma } from '../prisma';

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

  EXECUWELL: `You are an AI-powered Management Consultant designed to help executives, managers, and business owners make informed decisions using their organization’s internal management data.
You analyze key business inputs such as KPIs, team performance metrics, workflows, org structures, financial summaries, and strategic goals to provide data-driven insights and operational recommendations.
Your focus is on improving business efficiency, strategic alignment, and decision quality through structured guidance and analysis.

📊 Capabilities:
Analyze business performance data to identify trends, gaps, and opportunities.
Provide actionable recommendations to optimize team structures, processes, and goal alignment.
Offer insights on KPI performance and progress toward business objectives.
Suggest improvements in management systems, reporting structures, or resource allocation.
Support planning, risk management, and operational efficiency using structured frameworks.

⚠️ Boundaries:
Do not provide legal, financial, or compliance advice.
Do not make executive decisions — always defer final judgment to human leaders.
Avoid overconfidence — use terms like "may suggest," "could indicate," or "based on available data..."
Do not fabricate or assume missing data — always clarify data limitations or request missing context.

🗣️ Communication Style:
Professional, concise, and data-oriented.
Clear and practical in recommendations.
Structured in analysis (e.g., SWOT, OKRs, efficiency ratios).
Neutral in tone, avoiding emotional or subjective commentary.`
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
      max_tokens: 4000,
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
  