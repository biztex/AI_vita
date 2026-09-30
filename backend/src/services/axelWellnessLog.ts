/**
 * 健康・栄養・美容の相談記録 (β, client 2026-09-30 item 1)
 *
 * Flow: rich-menu 「健康・栄養・美容を相談」 → consultation → summary & record.
 *
 * Tapping the button opens a *wellness session*. Every exchange while the
 * session is open is appended to it, and the session is re-summarised
 * (topic / gist / categories / key points) for the dietitian after each turn.
 * The session closes when another consult button is tapped or after
 * SESSION_IDLE_MS of silence — the next tap starts a new record.
 *
 * Unlike axelMemory (a rolling 40-item prompt aid), this store is durable
 * and uncapped per user: it is the data the β period accumulates for the
 * future 管理栄養士向け画面. Same JSON-file storage as the other AXEL stores
 * (/var/lib/axel, covered by the nightly backup).
 */

import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { ENV } from '../env';
import { tuningParams } from './openaiParams';

export type WellnessCategory = '健康' | '栄養' | '美容';

export interface WellnessTurn {
  role: 'user' | 'axel';
  text: string;
  at: string;
}

export interface WellnessSummary {
  /** Short label — 「夕方の強い眠気」 */
  topic: string;
  /** 2〜4 sentences for the dietitian: what was asked, context, what AXEL suggested. */
  gist: string;
  categories: WellnessCategory[];
  /** Concrete facts worth checking at counseling (symptoms, habits, goals). */
  keyPoints: string[];
  /** True when the dietitian should follow up at the next counseling. */
  followUp: boolean;
  at: string;
  /** Heuristic placeholder (model unavailable) — replaced by the model summary. */
  provisional?: boolean;
}

export interface WellnessSession {
  id: string;
  startedAt: string;
  lastAt: string;
  source: 'menu';
  closed: boolean;
  turns: WellnessTurn[];
  summary?: WellnessSummary;
}

const SESSION_IDLE_MS = 60 * 60 * 1000; // 60 min of silence closes a session
const MAX_TURNS_PER_SESSION = 60;
const MAX_TURN_CHARS = 1500;

// ─── Storage ──────────────────────────────────────────────────────────

const PREFERRED = process.env.AXEL_WELLNESS_FILE || '/var/lib/axel/wellness_consultations.json';
const FALLBACK = '/tmp/axel_wellness_consultations.json';

function resolveFile(): string {
  try {
    fs.mkdirSync(path.dirname(PREFERRED), { recursive: true });
    fs.accessSync(path.dirname(PREFERRED), fs.constants.W_OK);
    return PREFERRED;
  } catch {
    return FALLBACK;
  }
}

const FILE = resolveFile();
const store = new Map<string, WellnessSession[]>();
let loaded = false;
let flushTimer: NodeJS.Timeout | null = null;

function load(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as Record<string, WellnessSession[]>;
      for (const [k, v] of Object.entries(parsed)) if (Array.isArray(v)) store.set(k, v);
      console.log(`[axelWellness] Loaded ${store.size} users from ${FILE}`);
    }
  } catch (err) {
    console.error('[axelWellness] Failed to load store:', err);
  }
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    try {
      const obj: Record<string, WellnessSession[]> = {};
      store.forEach((v, k) => (obj[k] = v));
      // Atomic replace so a crash mid-write never truncates the record.
      const tmp = `${FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), 'utf8');
      fs.renameSync(tmp, FILE);
    } catch (err) {
      console.error('[axelWellness] Failed to flush store:', err);
    }
  }, 200);
}

function sessionsOf(lineUserId: string): WellnessSession[] {
  load();
  let list = store.get(lineUserId);
  if (!list) {
    list = [];
    store.set(lineUserId, list);
  }
  return list;
}

function clip(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

// ─── Session lifecycle ────────────────────────────────────────────────

/** The open session, or null. Idle sessions are closed lazily here. */
export function activeWellnessSession(lineUserId: string, now = Date.now()): WellnessSession | null {
  const list = sessionsOf(lineUserId);
  const last = list[list.length - 1];
  if (!last || last.closed) return null;
  if (now - new Date(last.lastAt).getTime() > SESSION_IDLE_MS) {
    last.closed = true;
    scheduleFlush();
    return null;
  }
  return last;
}

/** Close the open session (if any). Empty sessions (no user turn) are dropped. */
export function endWellnessSession(lineUserId: string): void {
  const list = sessionsOf(lineUserId);
  const last = list[list.length - 1];
  if (!last || last.closed) return;
  if (!last.turns.some((t) => t.role === 'user')) list.pop();
  else last.closed = true;
  scheduleFlush();
}

/** Button tap: close any open session and start a fresh one with AXEL's opener. */
export function startWellnessSession(lineUserId: string, axelOpener: string): WellnessSession {
  endWellnessSession(lineUserId);
  const now = new Date().toISOString();
  const s: WellnessSession = {
    id: `w_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    startedAt: now,
    lastAt: now,
    source: 'menu',
    closed: false,
    turns: [{ role: 'axel', text: clip(axelOpener, MAX_TURN_CHARS), at: now }],
  };
  sessionsOf(lineUserId).push(s);
  scheduleFlush();
  return s;
}

/**
 * Append one exchange to the open session and refresh its summary
 * (fire-and-forget; never throws). No-op when no session is open.
 */
export function recordWellnessTurn(lineUserId: string, userText: string, axelReply: string): void {
  try {
    const s = activeWellnessSession(lineUserId);
    if (!s || !userText.trim()) return;
    const now = new Date().toISOString();
    s.turns.push({ role: 'user', text: clip(userText, MAX_TURN_CHARS), at: now });
    s.turns.push({ role: 'axel', text: clip(axelReply, MAX_TURN_CHARS), at: now });
    while (s.turns.length > MAX_TURNS_PER_SESSION) s.turns.shift();
    s.lastAt = now;
    // Provisional summary so the record is never empty, even if the model call fails.
    if (!s.summary || s.summary.provisional) s.summary = heuristicSummary(s);
    scheduleFlush();
    void refreshSummary(lineUserId, s.id);
  } catch (err) {
    console.error('[axelWellness] recordWellnessTurn failed (non-fatal):', err);
  }
}

// ─── Summarisation ────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

const CATEGORY_SET: WellnessCategory[] = ['健康', '栄養', '美容'];

function heuristicSummary(s: WellnessSession): WellnessSummary {
  const userTexts = s.turns.filter((t) => t.role === 'user').map((t) => t.text);
  const firstUser = userTexts[0] ?? '';
  const all = userTexts.join(' ');
  const cats: WellnessCategory[] = [];
  if (/睡眠|眠|疲|痛|体調|ストレス|運動|血圧|だる|頭|胃|便|冷え|生理/.test(all)) cats.push('健康');
  if (/食|栄養|サプリ|ビタミン|タンパク|糖|脂|体重|ダイエット|献立|飲|お酒|ご飯|パスタ|パン|間食|コンビニ|昼|朝|夕/.test(all)) cats.push('栄養');
  if (/肌|髪|美容|むくみ|シミ|ニキビ|乾燥|化粧|スキンケア|老化|たるみ|爪/.test(all)) cats.push('美容');
  if (cats.length === 0) cats.push('健康');
  return {
    topic: clip(firstUser.replace(/\s+/g, ' '), 24),
    gist: clip(userTexts.join(' / ').replace(/\s+/g, ' '), 200),
    categories: cats,
    keyPoints: [],
    followUp: false,
    at: new Date().toISOString(),
    provisional: true,
  };
}

function summaryPrompt(): string {
  return [
    'あなたは、管理栄養士が面談前に読む「相談記録」を作る担当です。',
    '以下は、利用者がAXEL（AIの相談相手）と行った健康・栄養・美容についての相談のやり取りです。',
    '管理栄養士がひと目で把握できるよう、次のJSONだけを返してください。',
    '{"topic": "相談の主題（20文字以内）", "gist": "何を相談し、どんな背景があり、AXELが何を伝えたか（2〜4文・200文字以内）", ',
    '"categories": ["健康"|"栄養"|"美容" のうち該当するもの], "keyPoints": ["面談で確認したい具体的事実（症状・頻度・生活習慣・目標など、各40文字以内、最大5件）"], ',
    '"followUp": 次回の面談で取り上げるべきならtrue}',
    '【厳守】利用者が実際に言ったことだけを書く。推測・診断はしない。個人の感想は「〜とのこと」と書く。',
  ].join('\n');
}

async function refreshSummary(lineUserId: string, sessionId: string): Promise<void> {
  const s = sessionsOf(lineUserId).find((x) => x.id === sessionId);
  if (!s) return;
  const transcript = s.turns
    .map((t) => `${t.role === 'user' ? '利用者' : 'AXEL'}：${t.text.slice(0, 600)}`)
    .join('\n')
    .slice(-6000);
  const turnCountAtStart = s.turns.length;
  try {
    const completion = await openai.chat.completions.create({
      model: ENV.AXEL_UPDATER_MODEL,
      messages: [
        { role: 'system', content: summaryPrompt() },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_object' },
      ...(tuningParams(ENV.AXEL_UPDATER_MODEL, { maxTokens: 600, temperature: 0 }) as any),
    });
    const j = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    // A newer turn arrived while the model ran — its own refresh will win.
    if (s.turns.length !== turnCountAtStart) return;
    const cats = (Array.isArray(j.categories) ? j.categories : []).filter((c: unknown): c is WellnessCategory =>
      CATEGORY_SET.includes(c as WellnessCategory),
    );
    if (typeof j.topic !== 'string' || typeof j.gist !== 'string' || !j.gist.trim()) return;
    s.summary = {
      topic: clip(j.topic, 30),
      gist: clip(j.gist, 260),
      categories: cats.length ? cats : s.summary?.categories ?? ['健康'],
      keyPoints: (Array.isArray(j.keyPoints) ? j.keyPoints : [])
        .filter((k: unknown) => typeof k === 'string' && k.trim())
        .slice(0, 5)
        .map((k: string) => clip(k, 60)),
      followUp: j.followUp === true,
      at: new Date().toISOString(),
    };
    scheduleFlush();
  } catch (err) {
    console.error('[axelWellness] summary failed, keeping provisional summary:', (err as any)?.code || (err as any)?.message || err);
  }
}

// ─── Read API (admin / future dietitian screen) ───────────────────────

/** Sessions that contain at least one user message, newest first. */
export function listWellnessSessions(lineUserId?: string): Array<WellnessSession & { lineUserId: string }> {
  load();
  const out: Array<WellnessSession & { lineUserId: string }> = [];
  store.forEach((list, uid) => {
    if (lineUserId && uid !== lineUserId) return;
    for (const s of list) if (s.turns.some((t) => t.role === 'user')) out.push({ ...s, lineUserId: uid });
  });
  return out.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

/**
 * Re-run the model summary for records that only have the heuristic
 * placeholder (e.g. saved while the OpenAI credit was exhausted).
 */
export async function resummarizeProvisional(): Promise<number> {
  load();
  const jobs: Array<Promise<void>> = [];
  store.forEach((list, uid) => {
    for (const s of list) if (s.summary?.provisional) jobs.push(refreshSummary(uid, s.id));
  });
  await Promise.all(jobs);
  return jobs.length;
}

/** Test hook: wipe in-memory state (does not touch the file). */
export function __resetWellnessForTests(): void {
  store.clear();
  loaded = true;
}
