/**
 * AXEL Memory — the "she remembers what you told her" layer.
 *
 * Why this exists:
 *  Client feedback: MyAI feels natural not because of tone but because it
 *  operates from "私はあなたをこう理解しています". A raw scroll of the last
 *  14 messages is NOT the same as that: the AI has to have digested prior
 *  conversation into a running understanding that can be surfaced at the
 *  START of the next conversation, not looked up in a log.
 *
 * What this stores per LINE user:
 *  - A rolling list of consultation *summaries* (topic, gist, feeling,
 *    outcome, followUpBy). Older ones are compacted or dropped.
 *  - The "current thread" — the most-recent open consultation that AXEL
 *    should proactively check back on when the user returns.
 *
 * Persistence: file-backed JSON at AXEL_MEMORY_FILE (defaults to
 * /var/lib/axel/memory.json, /tmp fallback). No DB migration required —
 * per client's operational constraint (no risky migrations to prod DB).
 *
 * How AXEL uses it (see axelEngine.buildSystemPrompt):
 *  - At every turn, the K most-recent summaries are injected into the
 *    system prompt as "I remember these things about you".
 *  - The current thread, if fresh, is offered as a natural conversation
 *    opener ("あの件、その後どう?") when the user returns after silence.
 *  - After the response, if the user's message clearly closed or
 *    advanced a thread, we compact/write a new summary.
 *
 * NOTE: Summary GENERATION (LLM summarisation of a conversation window)
 * is intentionally NOT done here — this module is the STORE. Summaries
 * are produced by callers using their preferred model, or by a
 * lightweight deterministic heuristic in axelFallback for the offline
 * path.
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────

/** One digested consultation memory — small, cheap to include in prompts. */
export interface ConsultationMemory {
  /** ISO timestamp of the interaction that produced this memory. */
  at: string;
  /** Short topic label — "組織拡大の判断", "睡眠の悩み", etc. */
  topic: string;
  /** 2〜4 sentence gist of what the user said and what AXEL replied. */
  gist: string;
  /** How the user seemed to feel — "迷い", "焦り", "落ち着いてきた", etc. */
  feeling?: string;
  /** Whether AXEL should proactively check back on this. */
  followUp?: boolean;
  /** Number of times AXEL has already followed up on this. */
  followUpCount?: number;
  /** Free-form tags for future retrieval — "経営", "健康", "家族", etc. */
  tags?: string[];
}

export interface AxelMemoryState {
  /** Rolling list of consultation memories (newest last). */
  memories: ConsultationMemory[];
  /** The still-open thread that AXEL should check back on when user returns. */
  openThread?: {
    topic: string;
    since: string;   // ISO
    lastMentioned?: string; // ISO
  };
}

// ─── Storage ──────────────────────────────────────────────────────────

const PREFERRED = process.env.AXEL_MEMORY_FILE || '/var/lib/axel/memory.json';
const FALLBACK = '/tmp/axel_memory.json';

function resolveMemoryFile(): string {
  try {
    const dir = path.dirname(PREFERRED);
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.axel_memory_probe');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return PREFERRED;
  } catch {
    return FALLBACK;
  }
}

const MEMORY_FILE = resolveMemoryFile();

const memoryStore = new Map<string, AxelMemoryState>();
let memoryLoaded = false;
let memoryFlushTimer: NodeJS.Timeout | null = null;

function loadMemoryIfNeeded(): void {
  if (memoryLoaded) return;
  memoryLoaded = true;
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const raw = fs.readFileSync(MEMORY_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, AxelMemoryState>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && Array.isArray(v.memories)) memoryStore.set(k, v);
      }
      console.log(`[axelMemory] Loaded ${memoryStore.size} memory entries from ${MEMORY_FILE}`);
    } else {
      console.log(`[axelMemory] No memory file at ${MEMORY_FILE} (starting fresh)`);
    }
  } catch (err) {
    console.error('[axelMemory] Failed to load memory file:', err);
  }
}

function scheduleMemoryFlush(): void {
  if (memoryFlushTimer) clearTimeout(memoryFlushTimer);
  memoryFlushTimer = setTimeout(() => {
    memoryFlushTimer = null;
    try {
      const obj: Record<string, AxelMemoryState> = {};
      memoryStore.forEach((v, k) => (obj[k] = v));
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('[axelMemory] Failed to flush memory:', err);
    }
  }, 200);
}

// ─── Public API ───────────────────────────────────────────────────────

const MAX_MEMORIES_PER_USER = 40;
const MAX_MEMORIES_IN_PROMPT = 6;

export function getMemory(lineUserId: string): AxelMemoryState {
  loadMemoryIfNeeded();
  return memoryStore.get(lineUserId) ?? { memories: [] };
}

/**
 * Add one new consultation memory. Silently trims the oldest if the list
 * exceeds MAX_MEMORIES_PER_USER — a soft cap to keep prompt sizes sane.
 */
export function addMemory(lineUserId: string, m: ConsultationMemory): void {
  loadMemoryIfNeeded();
  const cur = memoryStore.get(lineUserId) ?? { memories: [] };
  cur.memories.push(m);
  while (cur.memories.length > MAX_MEMORIES_PER_USER) cur.memories.shift();
  memoryStore.set(lineUserId, cur);
  scheduleMemoryFlush();
}

/**
 * Update or clear the current "open thread" — the still-alive consultation
 * AXEL should proactively return to when the user reappears.
 */
export function setOpenThread(
  lineUserId: string,
  thread: AxelMemoryState['openThread'] | null,
): void {
  loadMemoryIfNeeded();
  const cur = memoryStore.get(lineUserId) ?? { memories: [] };
  if (thread) cur.openThread = thread;
  else delete cur.openThread;
  memoryStore.set(lineUserId, cur);
  scheduleMemoryFlush();
}

/**
 * The K most-recent memories, newest first, suitable for injecting into a
 * prompt as "what AXEL remembers about this person".
 */
export function recentMemories(lineUserId: string, k = MAX_MEMORIES_IN_PROMPT): ConsultationMemory[] {
  loadMemoryIfNeeded();
  const cur = memoryStore.get(lineUserId);
  if (!cur || cur.memories.length === 0) return [];
  return cur.memories.slice(-k).reverse();
}

/**
 * The K most-recent memories carrying a given tag (経営/健康/家族/仕事),
 * newest first, scanning the FULL stored list — not just the last 6.
 *
 * Why: a health-focused opener（「最近は睡眠も気にされていましたよね」）must find
 * the last health consultation even if six business consultations happened
 * since. A pure recency slice would evict it.
 */
export function recentMemoriesByTag(
  lineUserId: string,
  tag: string,
  k = 3,
): ConsultationMemory[] {
  loadMemoryIfNeeded();
  const cur = memoryStore.get(lineUserId);
  if (!cur || cur.memories.length === 0) return [];
  return cur.memories
    .filter(
      (m) =>
        m.tags?.includes(tag) &&
        m.topic &&
        m.topic !== 'ふとした会話' &&
        m.topic !== '一言だけの記録',
    )
    .slice(-k)
    .reverse();
}

/** Days elapsed since an ISO timestamp; Infinity when unparsable. */
function daysSince(iso: string): number {
  try {
    const ms = Date.now() - new Date(iso).getTime();
    return Number.isFinite(ms) ? ms / (24 * 60 * 60 * 1000) : Infinity;
  } catch {
    return Infinity;
  }
}

/**
 * Format the memories as a compact block for the AI system prompt.
 * Empty string when no memories are present.
 */
export function memoryPromptBlock(lineUserId: string): string {
  const rows = recentMemories(lineUserId);
  if (rows.length === 0) return '';
  const lines = rows.map((m, i) => {
    const tagNote = m.tags && m.tags.length > 0 ? `（${m.tags.join('・')}）` : '';
    const parts = [`(${i + 1}) ${formatWhen(m.at)} — ${m.topic}${tagNote}`];
    parts.push(`    要点：${m.gist}`);
    if (m.feeling) parts.push(`    気持ち：${m.feeling}`);
    // A follow-up hint older than ~3 weeks reads as creepy, not caring —
    // the moment has passed. Only surface it while it's still fresh.
    if (m.followUp && daysSince(m.at) <= 21) {
      parts.push(`    続き：気になっている（そっと触れて良い）`);
    }
    return parts.join('\n');
  });
  return (
    `【AXELが憶えている最近の相談】\n${lines.join('\n\n')}\n\n` +
    `※ この記憶は「知っている前提」で会話を始めるための材料です。相談の入り口では、` +
    `新しい話題を聞き出す前に「最近は○○も気にされていましたよね」「この前の○○の続き?」と、` +
    `ここから自然に触れてください。挨拶や雑談への短い応答では、無理に持ち出さなくて構いません。`
  );
}

/**
 * If we have an open thread that's been quiet for a couple of days and
 * hasn't been followed up more than twice, return it as a natural
 * conversation opener. Otherwise null.
 *
 * This is the "friend who remembers to ask 'how did that go?'" behaviour.
 */
export function openThreadFollowUp(lineUserId: string): string | null {
  loadMemoryIfNeeded();
  const cur = memoryStore.get(lineUserId);
  const t = cur?.openThread;
  if (!t) return null;

  const sinceMs = Date.now() - new Date(t.since).getTime();
  const days = Math.floor(sinceMs / (24 * 60 * 60 * 1000));
  // Not stale enough yet — still an active concern; no need to nudge.
  if (days < 2) return null;
  // Too stale — user has moved on; don't bring it up.
  if (days > 30) return null;
  return t.topic;
}

/**
 * Record that we followed up on the open thread — so we don't repeat it
 * every single time the user opens LINE.
 */
export function markThreadFollowedUp(lineUserId: string): void {
  loadMemoryIfNeeded();
  const cur = memoryStore.get(lineUserId);
  if (!cur?.openThread) return;
  cur.openThread.lastMentioned = new Date().toISOString();
  memoryStore.set(lineUserId, cur);
  scheduleMemoryFlush();
}

// ─── Time formatting ──────────────────────────────────────────────────

function formatWhen(iso: string): string {
  try {
    const d = new Date(iso);
    const diffMs = Date.now() - d.getTime();
    const diffH = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffH < 24) return '今日';
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return '昨日';
    if (diffD < 7) return `${diffD}日前`;
    if (diffD < 30) return `${Math.floor(diffD / 7)}週間前`;
    return `${Math.floor(diffD / 30)}ヶ月前`;
  } catch {
    return '以前';
  }
}

// ─── Deterministic summariser (offline path) ──────────────────────────

/**
 * Should this exchange be remembered? Greetings, thanks, sign-offs, and
 * very-short affirmations are NOT worth carrying forward — otherwise the
 * memory list fills up with "こんにちは/おやすみ/ありがとう" and pushes real
 * consultations out.
 */
export function isWorthRemembering(userText: string): boolean {
  const t = userText.trim();
  if (!t) return false;
  // Casual openers / greetings / small talk — skip.
  if (t.length <= 20) {
    if (
      /^(こんにちは|こんばんは|おはよう|やあ|よう|バイバイ|じゃあね|また|また明日|おやすみ|おやすみなさい)/.test(t) ||
      /^(うん|はい|ええ|そう|うんうん|そうだね|ありがとう|感謝|助かった|助かる|ありがとうございます)/.test(t) ||
      /^(今.{0,5}時間|話せ|いい\?|大丈夫\?|ちょっといい|少しいい|元気\?|調子どう|何してる)/.test(t) ||
      /^(嬉しい|楽しい|よかった|良かった|最高|ハッピー)[。！!\s]*$/.test(t)
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Cheap non-LLM summariser used when we cannot call OpenAI (quota out,
 * network down). Extracts a topic/gist from a user↔AXEL exchange using
 * heuristics. Good enough to keep memory continuity during outages.
 *
 * Returns null if the exchange isn't worth remembering (greetings, thanks,
 * sign-offs). Callers should check for null before calling addMemory().
 */
export function heuristicSummarise(userText: string, axelText: string): ConsultationMemory | null {
  if (!isWorthRemembering(userText)) return null;
  const topic = detectTopic(userText) ?? detectTopic(axelText) ?? 'ふとした会話';
  const gist = [
    trimTo(userText, 60),
    axelText ? `→ ${trimTo(axelText, 60)}` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const feeling = detectFeeling(userText);
  const followUp = /(悩|迷|考え|検討|判断|決め|選び|進め|様子|後日|来週|次回)/.test(userText + axelText);
  const tags = detectTags(userText + ' ' + axelText);
  return {
    at: new Date().toISOString(),
    topic,
    gist,
    feeling,
    followUp,
    tags,
  };
}

function trimTo(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n) + '…';
}

function detectTopic(text: string): string | null {
  const topics: [RegExp, string][] = [
    [/組織|人事|採用|退職|離職|マネジメント/, '組織・人のこと'],
    [/資金|調達|投資家|シリーズ|バリュエーション/, '資金調達のこと'],
    [/売上|受注|営業|顧客|クライアント/, '事業・売上のこと'],
    [/戦略|方針|事業計画|中期|長期/, '経営戦略のこと'],
    [/ピボット|転換|方向|見直/, '方向性の見直し'],
    [/家族|妻|夫|子ども|息子|娘|両親/, '家族のこと'],
    [/睡眠|寝つき|不眠|眠れ/, '睡眠のこと'],
    [/疲労|だる|消耗|燃え尽き/, '疲労のこと'],
    [/体重|体型|ダイエット|痩せ/, '体型のこと'],
    [/集中|頭が回|判断力/, '集中力のこと'],
    [/運動|ジム|筋トレ|ゴルフ|ランニング/, '運動のこと'],
    [/食事|栄養|飲酒|お酒|会食/, '食生活のこと'],
  ];
  for (const [re, label] of topics) if (re.test(text)) return label;
  return null;
}

function detectFeeling(text: string): string | undefined {
  if (/焦|急|時間がない/.test(text)) return '焦り';
  if (/迷|悩|わからな/.test(text)) return '迷い';
  if (/不安|怖い|心配/.test(text)) return '不安';
  if (/疲|しんどい|きつい/.test(text)) return '疲れ';
  if (/嬉し|楽しみ|よかった|ありがた/.test(text)) return '前向き';
  if (/落ち着|整理|見えて/.test(text)) return '落ち着き';
  return undefined;
}

function detectTags(text: string): string[] {
  const out: string[] = [];
  if (/経営|事業|会社|組織|判断|戦略|資金/.test(text)) out.push('経営');
  if (/健康|体調|睡眠|疲労|体重|運動|食事/.test(text)) out.push('健康');
  if (/家族|妻|夫|子ども|親/.test(text)) out.push('家族');
  if (/仕事|プロジェクト|案件/.test(text)) out.push('仕事');
  return out;
}
