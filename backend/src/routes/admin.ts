import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { buildUserContextPrompt } from "../services/chatService";
import { processChat } from "../services/chatService";
import { resetRichMenu } from "../services/lineRichMenu";
import { listWellnessSessions, resummarizeProvisional } from "../services/axelWellnessLog";

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

// ── POST /admin/line/reset-rich-menu ──
// Force-deletes the current default rich menu and recreates it from the latest spec.
// Call this whenever the rich menu layout or actions have been updated.
// ── GET /admin/wellness-consultations ──
// 健康・栄養・美容の相談記録 (β, client 2026-09-30). Sessions started from the
// rich-menu button, newest first, with the dietitian-facing summary.
//   ?lineUserId=U…   one user only
//   ?format=csv      spreadsheet export (UTF-8 BOM so Excel opens it in JA)
//   ?turns=1         include the full exchange (JSON only)
r.get("/wellness-consultations", requireAuth(), requireAdmin(), async (req: any, res: any, next: any) => {
  try {
    const lineUserId = typeof req.query.lineUserId === "string" ? req.query.lineUserId : undefined;
    const sessions = listWellnessSessions(lineUserId);
    const users = await prisma.lineUser.findMany({
      where: { lineUserId: { in: Array.from(new Set(sessions.map((s) => s.lineUserId))) } },
      select: { lineUserId: true, displayName: true },
    });
    const nameOf = new Map(users.map((u) => [u.lineUserId, u.displayName ?? ""]));

    if (req.query.format === "csv") {
      const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const header = ["開始日時", "最終更新", "LINE表示名", "lineUserId", "区分", "相談の主題", "要約", "確認したい点", "要フォロー", "やり取り数"];
      const rows = sessions.map((s) => [
        s.startedAt, s.lastAt, nameOf.get(s.lineUserId) ?? "", s.lineUserId,
        (s.summary?.categories ?? []).join("・"), s.summary?.topic ?? "", s.summary?.gist ?? "",
        (s.summary?.keyPoints ?? []).join(" / "), s.summary?.followUp ? "○" : "",
        s.turns.filter((t) => t.role === "user").length,
      ].map(esc).join(","));
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="wellness_consultations.csv"');
      res.send("\uFEFF" + [header.map(esc).join(","), ...rows].join("\r\n"));
      return;
    }

    const withTurns = req.query.turns === "1";
    res.json({
      data: sessions.map(({ turns, ...s }) => ({
        ...s,
        displayName: nameOf.get(s.lineUserId) ?? null,
        userMessageCount: turns.filter((t) => t.role === "user").length,
        ...(withTurns ? { turns } : {}),
      })),
    });
  } catch (e) {
    next(e);
  }
});

// POST /admin/wellness-consultations/resummarize — upgrade placeholder summaries
r.post("/wellness-consultations/resummarize", requireAuth(), requireAdmin(), async (_req, res, next) => {
  try {
    res.json({ ok: true, attempted: await resummarizeProvisional() });
  } catch (e) {
    next(e);
  }
});

r.post("/line/reset-rich-menu", requireAuth(), requireAdmin(), async (_req, res, next) => {
  try {
    await resetRichMenu();
    res.json({ ok: true, message: 'Rich menu has been reset. Upload the new image to activate it.' });
  } catch (e) {
    next(e);
  }
});

// ── POST /admin/vita/nutrition-plan ──
// Register or version nutritionist design sheet (個別設計シート) for a LINE user.
r.post("/vita/nutrition-plan", requireAuth(), requireAdmin(), async (req: any, res: any, next: any) => {
  try {
    const { lineUserId, ownerId, payload, nextReviewAt, deactivatePrevious } = req.body as {
      lineUserId?: string;
      ownerId?: string;
      payload?: Record<string, unknown>;
      nextReviewAt?: string;
      deactivatePrevious?: boolean;
    };

    let resolvedLineUserId = lineUserId?.trim();
    const resolvedOwnerId = ownerId?.trim();

    if (!resolvedLineUserId && resolvedOwnerId) {
      const lu = await prisma.lineUser.findUnique({ where: { appUserId: resolvedOwnerId } });
      if (!lu) {
        return res.status(400).json({
          error: "No LINE user linked to this ownerId; pass lineUserId explicitly for LINE-only users.",
        });
      }
      resolvedLineUserId = lu.lineUserId;
    }

    if (!resolvedLineUserId) {
      return res.status(400).json({ error: "lineUserId (or linked ownerId) is required" });
    }
    if (!payload || typeof payload !== "object") {
      return res.status(400).json({ error: "payload (object) is required" });
    }

    const exists = await prisma.lineUser.findUnique({ where: { lineUserId: resolvedLineUserId } });
    if (!exists) {
      return res.status(404).json({ error: "LINE user not found" });
    }

    if (deactivatePrevious !== false) {
      await prisma.vitaNutritionPlan.updateMany({
        where: { lineUserId: resolvedLineUserId, isActive: true },
        data: { isActive: false },
      });
    }

    const maxV = await prisma.vitaNutritionPlan.aggregate({
      where: { lineUserId: resolvedLineUserId },
      _max: { version: true },
    });
    const version = (maxV._max.version ?? 0) + 1;

    const plan = await prisma.vitaNutritionPlan.create({
      data: {
        lineUserId: resolvedLineUserId,
        ownerId: resolvedOwnerId ?? null,
        version,
        nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : null,
        payload: payload as Prisma.InputJsonValue,
        isActive: true,
      },
    });

    res.json({ ok: true, id: plan.id, version: plan.version, lineUserId: resolvedLineUserId });
  } catch (e) {
    next(e);
  }
});

export default r;
