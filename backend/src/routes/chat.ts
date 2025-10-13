import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { processChat, validateChatInput, getOrCreateConversation, saveMessage, getConversationHistory } from "../services/chatService.js";
// import { rateLimit } from "../middlewares/rateLimit.ts";

const r = Router();

// rateLimit((req) => `chat:${req.user.id}`, 30, 60),

r.post("/", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    console.log(req.body);
    const { service, content, conversationId, title } = req.body;
    
    // Validate input
    if (!service || !content) {
      return res.status(400).json({ 
        error: '必須フィールドが不足しています: サービスとコンテンツが必要です' 
      });
    }

    // Validate service type
    if (!['VITAAI', 'EXECUWELL'].includes(service)) {
      return res.status(400).json({ 
        error: '無効なサービスタイプです。VITAAIまたはEXECUWELLである必要があります' 
      });
    }

    // Validate content
    const validation = validateChatInput(content);
    if (!validation.isValid) {
      return res.status(400).json({ 
        error: validation.error 
      });
    }

    // Get or create conversation
    const activeConversationId = await getOrCreateConversation(req.user.id, service, conversationId, title);

    // Save user message
    await saveMessage(activeConversationId, 'USER', content);

    // Process chat with AI (now includes conversation history)
    const reply = await processChat(service, content, req.user.id, activeConversationId);
    
    // Save AI response
    await saveMessage(activeConversationId, 'ASSISTANT', reply);

    res.json({ 
      conversationId: activeConversationId, 
      message: reply,
      service,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Chat route error:', e);
    next(e);
  }
});

// Get conversation history
r.get("/conversation/:conversationId", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({ 
        error: '会話IDが必要です' 
      });
    }

    const history = await getConversationHistory(conversationId, req.user.id);
    
    res.json({ 
      conversationId,
      messages: history,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Get conversation history error:', e);
    next(e);
  }
});

// Get user's conversations
r.get("/conversations", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { service } = req.query;
    
    const whereClause: any = {
      ownerId: req.user.id
    };
    
    if (service && ['VITAAI', 'EXECUWELL'].includes(service)) {
      whereClause.service = service;
    }

    const conversations = await prisma.chatConversation.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          select: {
            content: true,
            sender: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            messages: true
          }
        }
      }
    });

    const formattedConversations = conversations.map(conv => ({
      id: conv.id,
      service: conv.service,
      title: conv.title,
      createdAt: conv.createdAt,
      lastMessage: conv.messages[0] || null,
      messageCount: conv._count.messages
    }));

    res.json({ 
      conversations: formattedConversations,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Get conversations error:', e);
    next(e);
  }
});

// Update conversation title
r.patch("/conversation/:conversationId", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { conversationId } = req.params;
    const { title } = req.body;
    
    if (!conversationId) {
      return res.status(400).json({ 
        error: '会話IDが必要です' 
      });
    }

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ 
        error: 'タイトルが必要で、空にすることはできません' 
      });
    }

    const updatedConversation = await prisma.chatConversation.updateMany({
      where: {
        id: conversationId,
        ownerId: req.user.id
      },
      data: {
        title: title.trim()
      }
    });

    if (updatedConversation.count === 0) {
      return res.status(404).json({ 
        error: '会話が見つからないか、アクセスが拒否されました' 
      });
    }

    res.json({ 
      conversationId,
      title: title.trim(),
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Update conversation error:', e);
    next(e);
  }
});

// Delete conversation
r.delete("/conversation/:conversationId", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { conversationId } = req.params;
    console.log('Delete conversation request:', { conversationId, userId: req.user.id });
    
    if (!conversationId) {
      return res.status(400).json({ 
        error: '会話IDが必要です' 
      });
    }

    // First check if conversation exists and belongs to user
    const existingConversation = await prisma.chatConversation.findFirst({
      where: {
        id: conversationId,
        ownerId: req.user.id
      }
    });

    if (!existingConversation) {
      console.log('Conversation not found or access denied:', { conversationId, userId: req.user.id });
      return res.status(404).json({ 
        error: '会話が見つからないか、アクセスが拒否されました' 
      });
    }

    // First delete all messages in the conversation
    const deletedMessages = await prisma.chatMessage.deleteMany({
      where: {
        conversationId: conversationId
      }
    });

    console.log('Deleted messages:', deletedMessages.count);

    // Then delete the conversation
    const deletedConversation = await prisma.chatConversation.delete({
      where: {
        id: conversationId
      }
    });

    console.log('Conversation deleted successfully:', { conversationId, title: deletedConversation.title });

    res.json({ 
      success: true,
      message: '会話が正常に削除されました',
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Delete conversation error:', e);
    next(e);
  }
});

export default r;
