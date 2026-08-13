import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { processChat, validateChatInput, getOrCreateConversation, saveMessage, getConversationHistory, getMyAIWelcome } from "../services/chatService.js";
import OpenAI from "openai";
import { ENV } from "../env.js";

const openai = new OpenAI({
  apiKey: ENV.OPENAI_API_KEY
});
// import { rateLimit } from "../middlewares/rateLimit.ts";

const r = Router();

// Ensure upload directory exists
const uploadRoot = path.resolve('upload');
const audioDir = path.join(uploadRoot, 'audio');
fs.mkdirSync(audioDir, { recursive: true });

// Configure disk storage to persist files under upload/audio
const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, audioDir);
  },
  filename: (_req: any, file: any, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname || '') || (file.mimetype?.includes('mp4') ? '.mp4' : '.webm');
    const base = Date.now().toString();
    cb(null, `${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// Image upload (persisted under upload/images, served at /uploads/images)
const imageDir = path.join(uploadRoot, 'images');
fs.mkdirSync(imageDir, { recursive: true });
const imageStorage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: (e: Error | null, d: string) => void) => cb(null, imageDir),
  filename: (_req: any, file: any, cb: (e: Error | null, f: string) => void) =>
    cb(null, `${Date.now()}${path.extname(file.originalname || '') || '.jpg'}`),
});
const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) =>
    cb(null, /^image\//.test(file.mimetype || '')),
});

// rateLimit((req) => `chat:${req.user.id}`, 30, 60),

// GET MyAI welcome message (personalized greeting for empty chat)
// Accepts optional ?service=VITAAI|EXECUWELL for service-specific greeting
r.get("/myai-welcome", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const service = req.query.service as string | undefined;
    const { greeting, name } = await getMyAIWelcome(req.user.id, service);
    res.json({ greeting, name });
  } catch (e) {
    console.error('MyAI welcome error:', e);
    next(e);
  }
});

r.post("/", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    // console.log(req.body);
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

// ── Image chat (Vision) ──
// Accepts an uploaded image + optional caption; the model reads the image
// (text and elements) and replies, with the same web-user context as text chat.
r.post("/image", requireAuth(), imageUpload.single('image'), async (req: any, res: any, next: any) => {
  try {
    const { service, conversationId, title } = req.body;
    const caption: string = (req.body.caption || '').toString();
    if (!service || !['VITAAI', 'EXECUWELL', 'AXEL'].includes(service)) {
      return res.status(400).json({ error: '無効なサービスタイプです。' });
    }
    if (!req.file) {
      return res.status(400).json({ error: '画像が必要です。' });
    }

    const buf = fs.readFileSync(req.file.path);
    const mime = req.file.mimetype || 'image/jpeg';
    const imageDataUri = `data:${mime};base64,${buf.toString('base64')}`;
    const publicPath = `/uploads/images/${path.basename(req.file.path)}`;

    const activeConversationId = await getOrCreateConversation(req.user.id, service, conversationId, title);
    // Persist the user's image message (caption text + image URL for re-render)
    await saveMessage(activeConversationId, 'USER', caption || '[画像]', 'IMAGE', publicPath);

    const reply = await processChat(service, caption, req.user.id, activeConversationId, undefined, undefined, imageDataUri);
    await saveMessage(activeConversationId, 'ASSISTANT', reply);

    res.json({
      conversationId: activeConversationId,
      message: reply,
      imageUrl: publicPath,
      service,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Chat image route error:', e);
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

    const formattedConversations = conversations.map((conv: any) => ({
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

// Voice upload and transcription (single-step legacy)
r.post("/voice", requireAuth(), upload.single("audio"), async (req: any, res: any, next: any) => {
  try {
    const { service, conversationId, title } = req.body as { service: "VITAAI" | "EXECUWELL"; conversationId?: string; title?: string };

    if (!service || !["VITAAI", "EXECUWELL"].includes(service)) {
      return res.status(400).json({ error: "無効なサービスタイプです。VITAAIまたはEXECUWELLである必要があります" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "音声ファイルが必要です" });
    }

    // Public path to serve this audio (served at /uploads mapping)
    const relativePath = `/uploads/audio/${path.basename(req.file.path)}`;

    // Transcribe via Whisper using file stream
    const transcriptResp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path) as any,
      model: "whisper-1",
      language: "ja",
    } as any);
    console.log('transcriptResp', transcriptResp);
    const transcript: string = (transcriptResp as any).text || (transcriptResp as any).transcript || "";
    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "音声の文字起こしに失敗しました" });
    }
    // console.log(transcript);

    const activeConversationId = await getOrCreateConversation(req.user.id, service, conversationId, title);
    // Save user message as AUDIO kind with content = path
    await saveMessage(activeConversationId, 'USER', relativePath, 'VOICE');

    const reply = await processChat(service, transcript, req.user.id, activeConversationId);
    await saveMessage(activeConversationId, 'ASSISTANT', reply);

    res.json({
      conversationId: activeConversationId,
      message: reply,
      transcript,
      audioPath: relativePath,
      service,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Voice chat error:', e);
    next(e);
  }
});

// Step 1: Upload audio and save VOICE message with file path
r.post("/voice/upload", requireAuth(), upload.single("audio"), async (req: any, res: any, next: any) => {
  try {
    const { service, conversationId, title } = req.body as { service: "VITAAI" | "EXECUWELL"; conversationId?: string; title?: string };

    if (!service || !["VITAAI", "EXECUWELL"].includes(service)) {
      return res.status(400).json({ error: "無効なサービスタイプです。VITAAIまたはEXECUWELLである必要があります" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "音声ファイルが必要です" });
    }

    const relativePath = `/uploads/audio/${path.basename(req.file.path)}`;
    const activeConversationId = await getOrCreateConversation(req.user.id, service, conversationId, title);
    // Save voice message with URL and placeholder content
    await saveMessage(activeConversationId, 'USER', '音声メッセージを処理中...', 'VOICE', relativePath);

    res.json({
      conversationId: activeConversationId,
      audioPath: relativePath,
      service,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Voice upload error:', e);
    next(e);
  }
});

// Step 2: Process uploaded audio (transcribe + AI reply)
r.post("/voice/process", requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { service, conversationId, audioPath } = req.body as { service: "VITAAI" | "EXECUWELL"; conversationId: string; audioPath: string };
    if (!service || !["VITAAI", "EXECUWELL"].includes(service)) {
      return res.status(400).json({ error: "無効なサービスタイプです。VITAAIまたはEXECUWELLである必要があります" });
    }
    if (!conversationId || !audioPath) {
      return res.status(400).json({ error: "会話IDと音声パスが必要です" });
    }

    // Resolve local file system path securely
    const baseDir = path.resolve('upload/audio');
    const fileName = path.basename(audioPath);
    const absolutePath = path.join(baseDir, fileName);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "音声ファイルが見つかりません" });
    }

    const transcriptResp = await openai.audio.transcriptions.create({
      file: fs.createReadStream(absolutePath) as any,
      model: "whisper-1",
      language: "en",
    } as any);
    const transcript: string = (transcriptResp as any).text || (transcriptResp as any).transcript || "";
    if (!transcript || transcript.trim().length === 0) {
      return res.status(400).json({ error: "音声の文字起こしに失敗しました" });
    }

    // Update the voice message with transcribed text
    await prisma.chatMessage.updateMany({
      where: {
        conversationId: conversationId,
        sender: 'USER',
        kind: 'VOICE',
        voiceUrl: audioPath
      },
      data: {
        content: transcript
      }
    });

    const reply = await processChat(service, transcript, req.user.id, conversationId);
    await saveMessage(conversationId, 'ASSISTANT', reply);

    res.json({
      conversationId,
      message: reply,
      transcript,
      service,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Voice process error:', e);
    next(e);
  }
});
