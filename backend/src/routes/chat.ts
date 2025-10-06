import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";

const r = Router();

r.post("/", requireAuth(), rateLimit((req) => `chat:${req.user.id}`, 30, 60), async (req, res, next) => {
  try {
    const { service, content } = req.body;
    const convo = await prisma.chatConversation.create({
      data: { ownerId: req.user.id, service, title: `New ${service} chat` },
    });
    await prisma.chatMessage.create({
      data: { conversationId: convo.id, sender: "user", kind: "text", content },
    });
    const reply = "[mvp-stub] Thank you!";
    await prisma.chatMessage.create({
      data: { conversationId: convo.id, sender: "assistant", kind: "text", content: reply },
    });
    res.json({ conversationId: convo.id, message: reply });
  } catch (e) {
    next(e);
  }
});

export default r;
