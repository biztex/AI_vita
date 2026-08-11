/**
 * LINE Rich Menu – AXEL (2026-08-11 client-designed 6-item navigation)
 *
 * Layout (2500 x 1686 px / 3 rows × 2 columns). Per the client's screen design,
 * the menu is NOT for consultation — users just talk in the normal chat with
 * text / image / voice. The menu is the entry to information, reservation, and
 * account screens (LIFF pages).
 *
 *  ┌────────────────────────┬────────────────────────┐
 *  │  ① AXELレポート        │  ② パーソナルプラン    │  → /report      /personalplan
 *  ├────────────────────────┼────────────────────────┤
 *  │  ③ 性格診断            │  ④ 検査結果            │  → /personality /karte
 *  ├────────────────────────┼────────────────────────┤
 *  │  ⑤ 面談予約            │  ⑥ マイページ          │  → /reservation /mypage
 *  └────────────────────────┴────────────────────────┘
 *
 * All six actions are `uri` actions opening a LIFF page. No consultation
 * postbacks (removed per the client's 2026-08-11 direction).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as line from '@line/bot-sdk';
import { ENV } from '../env';
import { lineClient } from './lineService';

// ── Blob client for image upload ──
// The main MessagingApiClient can't upload rich menu images — that lives
// on the data endpoint (api-data.line.me). We instantiate a BlobClient
// with the same channel access token.
const blobClient = new line.messagingApi.MessagingApiBlobClient({
  channelAccessToken: ENV.LINE_CHANNEL_ACCESS_TOKEN,
});

// ── Rich menu image path ──
// The 2500×1686 PNG produced by scripts/build-richmenu-image.py.
// We look for it in multiple places so the setup works whether the
// image is committed, or pre-generated to /tmp, or lives in the repo.
const IMAGE_CANDIDATES = [
  process.env.AXEL_RICHMENU_IMAGE || '',
  '/tmp/axel_richmenu_2500x1686.png',
  path.resolve(process.cwd(), 'axel_richmenu_2500x1686.png'),
  path.resolve(process.cwd(), 'assets/axel_richmenu_2500x1686.png'),
].filter(Boolean);

function findRichMenuImage(): string | null {
  for (const p of IMAGE_CANDIDATES) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const W = 2500;   // total width  (LINE recommended)
const H = 1686;   // total height (LINE recommended)

const COL = Math.floor(W / 2);  // 1250px – one column unit
const ROW = Math.floor(H / 3);  // 562px  – one row unit (3-row layout)

// LIFF deep-link base. Rich-menu buttons open LIFF pages by route.
const LIFF_ID = ENV.LIFF_ID_PAGES || '2009125242-ka7XZSEQ';
const liff = (route: string) => `https://liff.line.me/${LIFF_ID}/${route}`;

// ── Rich Menu definition ──────────────────────────────────────────────────────

/**
 * v11 — Explicit conversation entry points, per client's 2026-07-04 request:
 *   ・相談する
 *   ・健康について相談する
 *   ・判断について相談する
 *   ・今日の状態を確認する
 *
 * The client's stated design goal:
 *   「『自然な会話』と『分かりやすいLINEメニュー』は両立できる設計を目指したい」
 *
 * Each button is a natural conversation opener that pre-selects the focus.
 * For explicit topic-scoped buttons (health / judgment), the engine
 * frames AXEL's opening around that domain but never blocks the user
 * from switching topics mid-conversation.
 *
 * Settings (mode toggle / morning push) are reachable via the text
 * command "設定" — kept out of the rich menu to preserve the client's
 * "4 explicit entry points" model.
 */
const RICH_MENU_BODY = {
  size: { width: W, height: H },
  selected: true,
  name: 'AXEL 6項目ナビ (クライアント2026-08-11設計)',
  chatBarText: 'メニュー',
  areas: [
    // Row 1
    {
      bounds: { x: 0, y: 0, width: COL, height: ROW },
      action: { type: 'uri' as const, label: 'AXELレポート', uri: liff('report') },
    },
    {
      bounds: { x: COL, y: 0, width: W - COL, height: ROW },
      action: { type: 'uri' as const, label: 'パーソナルプラン', uri: liff('personalplan') },
    },
    // Row 2
    {
      bounds: { x: 0, y: ROW, width: COL, height: ROW },
      action: { type: 'uri' as const, label: '性格診断', uri: liff('personality') },
    },
    {
      bounds: { x: COL, y: ROW, width: W - COL, height: ROW },
      action: { type: 'uri' as const, label: '検査結果', uri: liff('karte') },
    },
    // Row 3 (last row absorbs rounding: height to bottom edge)
    {
      bounds: { x: 0, y: ROW * 2, width: COL, height: H - ROW * 2 },
      action: { type: 'uri' as const, label: '面談予約', uri: liff('reservation') },
    },
    {
      bounds: { x: COL, y: ROW * 2, width: W - COL, height: H - ROW * 2 },
      action: { type: 'uri' as const, label: 'マイページ', uri: liff('mypage') },
    },
  ],
};

// ── Setup ─────────────────────────────────────────────────────────────────────

export async function setupRichMenu(): Promise<void> {
  try {
    // Check if a default rich menu already exists
    const existingDefault = await lineClient.getDefaultRichMenuId().catch(() => null);
    if (existingDefault) {
      const id = typeof existingDefault === 'string' ? existingDefault : (existingDefault as any)?.richMenuId;

      // If the existing menu is already the current version, skip
      if (id) {
        const existing = await lineClient.getRichMenu(id).catch(() => null);
        const existingName = (existing as any)?.name ?? '';
        if (existingName === RICH_MENU_BODY.name) {
          console.log('[LINE Rich Menu] Already up-to-date:', id);
          return;
        }
        // Outdated menu – delete it and recreate
        console.log('[LINE Rich Menu] Outdated menu found, replacing:', existingName, '→', RICH_MENU_BODY.name);
        await lineClient.cancelDefaultRichMenu().catch(() => null);
        await lineClient.deleteRichMenu(id).catch(() => null);
      } else {
        console.log('[LINE Rich Menu] Default rich menu already set:', id);
        return;
      }
    }

    // Create the rich menu
    const response = await lineClient.createRichMenu(RICH_MENU_BODY as any);
    const richMenuId = typeof response === 'string' ? response : (response as any)?.richMenuId;
    if (!richMenuId) {
      console.warn('[LINE Rich Menu] createRichMenu returned unexpected result:', response);
      return;
    }
    console.log('[LINE Rich Menu] Created rich menu:', richMenuId);

    // ── Upload the image (REQUIRED before setDefault can succeed) ──
    // Historical bug: this step used to be a documentation comment only,
    // so setDefaultRichMenu would silently fail, and users would see NO
    // menu. Now we do it automatically at startup.
    const imagePath = findRichMenuImage();
    if (!imagePath) {
      console.warn(
        '[LINE Rich Menu] No image found in candidates:', IMAGE_CANDIDATES,
        '— menu created but cannot be set as default. Generate with scripts/build-richmenu-image.py',
      );
      return;
    }
    try {
      const buffer = fs.readFileSync(imagePath);
      const blob = new Blob([buffer], { type: 'image/png' });
      await blobClient.setRichMenuImage(richMenuId, blob);
      console.log('[LINE Rich Menu] Uploaded image from', imagePath);
    } catch (uploadErr: any) {
      console.error(
        '[LINE Rich Menu] Image upload failed — menu will not display:',
        uploadErr?.message || uploadErr,
      );
      return;
    }

    // ── Set as default (only works once the image is uploaded) ──
    try {
      await lineClient.setDefaultRichMenu(richMenuId);
      console.log('[LINE Rich Menu] Set as default rich menu:', richMenuId);
    } catch (setErr: any) {
      console.error(
        '[LINE Rich Menu] setDefault failed after upload (unexpected):',
        setErr?.message || setErr,
      );
    }
  } catch (err: any) {
    // Non-fatal – bot works fine without rich menu
    console.warn('[LINE Rich Menu] Setup skipped:', err?.message || err);
  }
}

/**
 * Force-recreates the rich menu (deletes existing default first).
 * Call this when the menu layout or actions need to be updated.
 */
export async function resetRichMenu(): Promise<void> {
  try {
    const existingDefault = await lineClient.getDefaultRichMenuId().catch(() => null);
    if (existingDefault) {
      const id = typeof existingDefault === 'string' ? existingDefault : (existingDefault as any)?.richMenuId;
      await lineClient.cancelDefaultRichMenu().catch(() => null);
      await lineClient.deleteRichMenu(id).catch(() => null);
      console.log('[LINE Rich Menu] Deleted old rich menu:', id);
    }
  } catch (err: any) {
    console.warn('[LINE Rich Menu] Could not delete old menu:', err?.message || err);
  }
  // Reset flag so setupRichMenu will create a fresh one
  await setupRichMenu();
}
