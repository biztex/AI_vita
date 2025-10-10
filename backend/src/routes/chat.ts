import { Router } from "express";
import { prisma } from "../prisma.ts";
import { requireAuth } from "../middlewares/auth.ts";
// import { rateLimit } from "../middlewares/rateLimit.ts";

const r = Router();

// rateLimit((req) => `chat:${req.user.id}`, 30, 60),

r.post("/",requireAuth(), async (req: any, res: any, next: any) => {
  try {
    console.log(req.body);
    const { service, content } = req.body;
    const convo = await prisma.chatConversation.create({
      data: { ownerId: req.user.id, service, title: `New ${service} chat` },
    });
    await prisma.chatMessage.create({
      data: { conversationId: convo.id, sender: "USER", kind: "TEXT", content },
    });
    const reply = "[mvp-stub] Thank you!";
    await prisma.chatMessage.create({
      data: { conversationId: convo.id, sender: "ASSISTANT", kind: "TEXT", content: reply },
    });
    res.json({ conversationId: convo.id, message: reply });
  } catch (e) {
    console.log(e);
    next(e);
  }
});

export default r;
