import { Router } from "express";
import { prisma } from "../prisma.ts";
import { requireAuth } from "../middlewares/auth.ts";
// import { rateLimit } from "../middlewares/rateLimit.ts";

const r = Router();

// GET personality results for current user
r.get("/", requireAuth(), async (req, res, next) => {
  try {
    const results = await prisma.personalityResult.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ results });
  } catch (e) {
    next(e);
  }
});

// POST personality result
// rateLimit((req) => `personality:${req.user.id}`, 10, 60)
r.post("/", requireAuth(), async (req, res, next) => {
  try {
    const { testType, result, fileKey } = req.body;
    if (!testType) return res.status(400).json({ error: "bad_request" });
    await prisma.personalityResult.create({
      data: {
        ownerId: req.user.id,
        testType,
        result,
        fileKey,
        status: "RECEIVED",
      },
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
