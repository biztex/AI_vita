import { Router } from "express";
import { prisma } from "../prisma.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.js";

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

export default r;
