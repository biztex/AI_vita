import { Router, Request, Response } from 'express';
import * as line from '@line/bot-sdk';
import { ENV } from '../env';
import { handleLineEvent } from '../services/lineService';
import { buildLineLoginUrl, handleLineLoginCallback } from '../services/lineLoginService';
import { requireAuth } from '../middlewares/auth';
import { prisma } from '../prisma';

const r = Router();

// ── Webhook (POST /line/webhook) ──
// LINE sends events here – needs raw body for HMAC verification.
// Body parsing is handled specifically: the main app skips JSON parse for this path.
r.post(
  '/webhook',
  // Use LINE middleware to verify X-Line-Signature
  line.middleware({
    channelSecret: ENV.LINE_CHANNEL_SECRET,
    channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
  } as line.MiddlewareConfig),
  async (req: Request, res: Response) => {
    const events = (req.body as line.WebhookRequestBody).events ?? [];
    console.log(`[LINE webhook] Received ${events.length} event(s)`);

    // Immediately respond 200 to LINE (must be < 1s)
    res.status(200).json({ ok: true });

    // Process events in background
    for (const event of events) {
      try {
        console.log(`[LINE webhook] Processing event type: ${event.type}`);
        await handleLineEvent(event);
      } catch (err) {
        console.error('[LINE webhook] Error processing event:', err);
      }
    }
  },
);

// ── GET /line/login-url ──
// Returns the LINE Login authorization URL (frontend redirects user here)
r.get('/login-url', requireAuth(), async (req: any, res: any) => {
  try {
    const state = req.query.state as string;
    if (!state) {
      return res.status(400).json({ error: 'state parameter is required' });
    }
    const url = buildLineLoginUrl(state);
    res.json({ url });
  } catch (err: any) {
    console.error('[LINE Login] URL generation failed:', err);
    res.status(500).json({ error: 'Failed to generate LINE Login URL' });
  }
});

// ── POST /line/link-oauth ──
// Modern OAuth callback handler: exchanges code for tokens, verifies, and links accounts
r.post('/link-oauth', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { code, state, expectedState } = req.body;
    if (!code || !state || !expectedState) {
      return res.status(400).json({ error: 'code, state, and expectedState are required' });
    }

    const appUserId = req.user.id;
    const result = await handleLineLoginCallback(code, state, appUserId, expectedState);

    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[LINE Login] OAuth callback failed:', err);
    if (err.message?.includes('State mismatch')) {
      return res.status(400).json({ error: err.message });
    }
    if (err.response?.status === 400) {
      return res.status(400).json({ error: 'LINE Login failed. Code may be expired or invalid.' });
    }
    next(err);
  }
});

// ── Link LINE account to web user (POST /line/link) ──
// DEPRECATED: legacy manual linking (kept for backward compat)
// Authenticated web user sends a linkCode they obtained from LINE
r.post('/link', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const { lineUserId } = req.body;
    if (!lineUserId) {
      return res.status(400).json({ error: 'lineUserId is required' });
    }

    const appUserId = req.user.id;

    // Check if this LINE user exists
    const lineUser = await prisma.lineUser.findUnique({ where: { lineUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'LINE user not found. Please add the bot as a friend first.' });
    }

    // Link the accounts
    await prisma.lineUser.update({
      where: { lineUserId },
      data: { appUserId },
    });

    res.json({ ok: true, message: 'LINEアカウントを連携しました' });
  } catch (err: any) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'This web account is already linked to a LINE account.' });
    }
    next(err);
  }
});

// ── Unlink LINE account (POST /line/unlink) ──
r.post('/unlink', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const appUserId = req.user.id;
    const lineUser = await prisma.lineUser.findUnique({ where: { appUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'No LINE account linked.' });
    }
    await prisma.lineUser.update({
      where: { id: lineUser.id },
      data: { appUserId: null },
    });
    res.json({ ok: true, message: 'LINE連携を解除しました' });
  } catch (err) {
    next(err);
  }
});

// ── Get LINE link status (GET /line/status) ──
r.get('/status', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const appUserId = req.user.id;
    const lineUser = await prisma.lineUser.findUnique({ where: { appUserId } });
    res.json({
      linked: !!lineUser,
      lineUserId: lineUser?.lineUserId ?? null,
      userMode: lineUser?.userMode ?? null,
      morningPushEnabled: lineUser?.morningPushEnabled ?? false,
    });
  } catch (err) {
    next(err);
  }
});

// ── Toggle morning push (POST /line/morning-push) ──
r.post('/morning-push', requireAuth(), async (req: any, res: any, next: any) => {
  try {
    const appUserId = req.user.id;
    const { enabled } = req.body;
    const lineUser = await prisma.lineUser.findUnique({ where: { appUserId } });
    if (!lineUser) {
      return res.status(404).json({ error: 'No LINE account linked.' });
    }
    await prisma.lineUser.update({
      where: { id: lineUser.id },
      data: { morningPushEnabled: !!enabled },
    });
    res.json({ ok: true, morningPushEnabled: !!enabled });
  } catch (err) {
    next(err);
  }
});

export default r;
