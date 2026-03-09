import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { buildUserContextPrompt } from "../services/chatService";
import { processChat } from "../services/chatService";

const r = Router();

r.get("/personality", requireAuth(), requireAdmin(), async (_req, res, next) => {
  try {
    const data = await prisma.personalityResult.findMany({ orderBy: { createdAt: "desc" } });
    res.json({ data });
  } catch (e) {
    next(e);
  }
});

r.put("/personality", requireAuth(), requireAdmin(), async (req, res, next) => {
  try {
    const { id, status } = req.body;
    await prisma.personalityResult.update({ where: { id }, data: { status } });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ── GET /admin/line-users ──
r.get("/line-users", requireAuth(), requireAdmin(), async (_req, res, next) => {
  try {
    const lineUsers = await prisma.lineUser.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        appUser: {
          select: {
            email: true,
            name: true,
            subscription: true,
          },
        },
      },
    });
    res.json({
      data: lineUsers.map((lu) => ({
        id: lu.id,
        lineUserId: lu.lineUserId,
        displayName: lu.displayName,
        userMode: lu.userMode,
        morningPushEnabled: lu.morningPushEnabled,
        linked: !!lu.appUserId,
        appUserEmail: lu.appUser?.email ?? null,
        appUserName: lu.appUser?.name ?? null,
        subscription: lu.appUser?.subscription ?? null,
        createdAt: lu.createdAt,
      })),
    });
  } catch (e) {
    next(e);
  }
});

// ── POST /admin/test-prompt ──
// Admin tool: preview the generated system prompt for a given user + service
r.post("/test-prompt", requireAuth(), requireAdmin(), async (req: any, res: any, next: any) => {
  try {
    const { userId, service } = req.body;
    if (!userId || !service) {
      return res.status(400).json({ error: "userId and service are required" });
    }
    if (!['EXECUWELL', 'VITAAI'].includes(service)) {
      return res.status(400).json({ error: "service must be EXECUWELL or VITAAI" });
    }

    const prompt = await buildUserContextPrompt(userId, service);
    res.json({ userId, service, prompt });
  } catch (e) {
    next(e);
  }
});

// ── POST /admin/test-chat ──
// Admin tool: send a test message as if it came from a specific user
r.post("/test-chat", requireAuth(), requireAdmin(), async (req: any, res: any, next: any) => {
  try {
    const { userId, service, message } = req.body;
    if (!userId || !service || !message) {
      return res.status(400).json({ error: "userId, service, and message are required" });
    }
    if (!['EXECUWELL', 'VITAAI'].includes(service)) {
      return res.status(400).json({ error: "service must be EXECUWELL or VITAAI" });
    }

    const reply = await processChat(service, message, userId);
    res.json({ userId, service, message, reply });
  } catch (e) {
    next(e);
  }
});

export default r;
