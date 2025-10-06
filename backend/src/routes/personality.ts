import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rateLimit.js";

const r = Router();

r.post("/", requireAuth(), rateLimit((req) => `personality:${req.user.id}`, 10, 60), async (req, res, next) => {
  try {
    const { testType, fileKey } = req.body;
    if (!testType || !fileKey) return res.status(400).json({ error: "bad_request" });
    await prisma.personalityResult.create({
      data: { ownerId: req.user.id, testType, fileKey, status: "RECEIVED" },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
