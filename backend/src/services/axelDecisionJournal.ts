/**
 * AXEL Decision Journal — the "判断履歴" layer.
 *
 * Why this exists:
 *  When a founder consults AXEL about a real decision (fundraising round,
 *  key hire, pivot, org restructure, etc.), the value is not the single
 *  reply — it is that AXEL then knows a decision is in flight, remembers
 *  which options were on the table, and can gently return to it days later
 *  to ask how it went. That closes the loop the client explicitly named:
 *  "利用者が『また相談したい』と思える流れ".
 *
 * What this stores per LINE user:
 *  - decisions[]: each with { theme, options?, chosen?, chosenAt?,
 *    outcome?, concern?, followUpAt }
 *  - A decision starts OPEN when AXEL detects a live consultation.
 *    It moves to CHOSEN when the user announces the decision, and to
 *    CLOSED when the user reports the outcome (or after 60 days silence).
 *
 * How the engine uses it:
 *  - buildSystemPrompt injects OPEN and CHOSEN-but-not-yet-followed-up
 *    decisions as background context.
 *  - Postback shortcuts (open_chat, check_in) surface the freshest
 *    unresolved decision as a natural opener when appropriate.
 *  - After each turn we heuristically detect state transitions from the
 *    user's text (「〜に決めました」→ CHOSEN; 「あの後うまくいった」→ CLOSED).
 *
 * Persistence: file-backed JSON at AXEL_JOURNAL_FILE (defaults to
 * /var/lib/axel/decisions.json, /tmp fallback). No DB migration.
 */
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────

export type DecisionStatus = 'OPEN' | 'CHOSEN' | 'CLOSED';

export interface DecisionEntry {
  id: string;              // "d_<epoch>"
  createdAt: string;       // ISO
  theme: string;           // "組織拡大の判断", "シリーズBの調達タイミング" etc
  options?: string[];      // parsed choices ("拡大", "維持", "縮小" etc)
  chosen?: string;         // the option they eventually picked
  chosenAt?: string;       // ISO
  outcome?: string;        // user-reported result later
  outcomeAt?: string;      // ISO
  concern?: string;        // 気にしていた点 ("投資家との関係", etc)
  status: DecisionStatus;
  /** ISO — earliest we should proactively check back on this. */
  followUpAt?: string;
  /** How many times AXEL has already followed up. */
  followUpCount?: number;
}

export interface DecisionJournalState {
  decisions: DecisionEntry[];
}

// ─── Storage ──────────────────────────────────────────────────────────

const PREFERRED = process.env.AXEL_JOURNAL_FILE || '/var/lib/axel/decisions.json';
const FALLBACK = '/tmp/axel_decisions.json';

function resolveJournalFile(): string {
  try {
    const dir = path.dirname(PREFERRED);
    fs.mkdirSync(dir, { recursive: true });
    const probe = path.join(dir, '.axel_journal_probe');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return PREFERRED;
  } catch {
    return FALLBACK;
  }
}

const JOURNAL_FILE = resolveJournalFile();

const journalStore = new Map<string, DecisionJournalState>();
let journalLoaded = false;
let journalFlushTimer: NodeJS.Timeout | null = null;

function loadJournalIfNeeded(): void {
  if (journalLoaded) return;
  journalLoaded = true;
  try {
    if (fs.existsSync(JOURNAL_FILE)) {
      const raw = fs.readFileSync(JOURNAL_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, DecisionJournalState>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && Array.isArray(v.decisions)) journalStore.set(k, v);
      }
      console.log(`[axelDecisionJournal] Loaded ${journalStore.size} journals from ${JOURNAL_FILE}`);
    } else {
      console.log(`[axelDecisionJournal] No journal at ${JOURNAL_FILE} (starting fresh)`);
    }
  } catch (err) {
    console.error('[axelDecisionJournal] Failed to load journal:', err);
  }
}

function scheduleJournalFlush(): void {
  if (journalFlushTimer) clearTimeout(journalFlushTimer);
  journalFlushTimer = setTimeout(() => {
    journalFlushTimer = null;
    try {
      const obj: Record<string, DecisionJournalState> = {};
      journalStore.forEach((v, k) => (obj[k] = v));
      fs.writeFileSync(JOURNAL_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('[axelDecisionJournal] Failed to flush:', err);
    }
  }, 200);
}

const MAX_DECISIONS_PER_USER = 30;
const MAX_IN_PROMPT = 4;
const DEFAULT_FOLLOWUP_DAYS = 5;

// ─── Public API ───────────────────────────────────────────────────────

export function getJournal(lineUserId: string): DecisionJournalState {
  loadJournalIfNeeded();
  return journalStore.get(lineUserId) ?? { decisions: [] };
}

/**
 * Open a new decision entry. Called from the engine when a live judgment
 * consultation is detected.
 */
export function openDecision(
  lineUserId: string,
  theme: string,
  opts: { options?: string[]; concern?: string; followUpDays?: number } = {},
): DecisionEntry {
  loadJournalIfNeeded();
  const cur = journalStore.get(lineUserId) ?? { decisions: [] };

  // Coalesce: if there is already an OPEN decision with the same theme, reuse it.
  const existing = cur.decisions.find(
    (d) => d.status === 'OPEN' && normalizeTheme(d.theme) === normalizeTheme(theme),
  );
  if (existing) {
    if (opts.options && opts.options.length > 0) {
      existing.options = Array.from(new Set([...(existing.options ?? []), ...opts.options]));
    }
    if (opts.concern) existing.concern = opts.concern;
    scheduleJournalFlush();
    return existing;
  }

  const entry: DecisionEntry = {
    id: `d_${Date.now()}`,
    createdAt: new Date().toISOString(),
    theme,
    options: opts.options,
    concern: opts.concern,
    status: 'OPEN',
    followUpAt: futureIso(opts.followUpDays ?? DEFAULT_FOLLOWUP_DAYS),
    followUpCount: 0,
  };
  cur.decisions.push(entry);
  while (cur.decisions.length > MAX_DECISIONS_PER_USER) cur.decisions.shift();
  journalStore.set(lineUserId, cur);
  scheduleJournalFlush();
  return entry;
}

/** Mark a decision as chosen (user picked an option). */
export function markChosen(lineUserId: string, decisionId: string, chosen: string): void {
  loadJournalIfNeeded();
  const cur = journalStore.get(lineUserId);
  if (!cur) return;
  const d = cur.decisions.find((x) => x.id === decisionId);
  if (!d) return;
  d.chosen = chosen;
  d.chosenAt = new Date().toISOString();
  d.status = 'CHOSEN';
  d.followUpAt = futureIso(7); // check back in a week to see how it's going
  scheduleJournalFlush();
}

/** Record the outcome the user reported and close the decision. */
export function markOutcome(lineUserId: string, decisionId: string, outcome: string): void {
  loadJournalIfNeeded();
  const cur = journalStore.get(lineUserId);
  if (!cur) return;
  const d = cur.decisions.find((x) => x.id === decisionId);
  if (!d) return;
  d.outcome = outcome;
  d.outcomeAt = new Date().toISOString();
  d.status = 'CLOSED';
  delete d.followUpAt;
  scheduleJournalFlush();
}

/**
 * Return the freshest decision AXEL should proactively check back on right
 * now, or null. Considers followUpAt (must be past), followUpCount (max 2),
 * and status (OPEN or CHOSEN — CLOSED is done).
 */
export function nextFollowUp(lineUserId: string): DecisionEntry | null {
  loadJournalIfNeeded();
  const cur = journalStore.get(lineUserId);
  if (!cur || cur.decisions.length === 0) return null;
  const now = Date.now();
  const candidates = cur.decisions
    .filter((d) => d.status !== 'CLOSED')
    .filter((d) => (d.followUpCount ?? 0) < 2)
    .filter((d) => d.followUpAt && new Date(d.followUpAt).getTime() <= now)
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
  return candidates[0] ?? null;
}

/** Record that we brought this decision up — space out the next check-back. */
export function noteFollowedUp(lineUserId: string, decisionId: string): void {
  loadJournalIfNeeded();
  const cur = journalStore.get(lineUserId);
  if (!cur) return;
  const d = cur.decisions.find((x) => x.id === decisionId);
  if (!d) return;
  d.followUpCount = (d.followUpCount ?? 0) + 1;
  d.followUpAt = futureIso(10); // don't ask again for 10 days
  scheduleJournalFlush();
}

/** OPEN or CHOSEN decisions AXEL should keep in mind for this session. */
export function activeDecisions(lineUserId: string, k = MAX_IN_PROMPT): DecisionEntry[] {
  loadJournalIfNeeded();
  const cur = journalStore.get(lineUserId);
  if (!cur) return [];
  return cur.decisions
    .filter((d) => d.status !== 'CLOSED')
    .slice(-k)
    .reverse();
}

/** Compact prompt block for AXEL — "what live decisions is this person facing". */
export function journalPromptBlock(lineUserId: string): string {
  const rows = activeDecisions(lineUserId);
  if (rows.length === 0) return '';
  const lines = rows.map((d, i) => {
    const parts = [`(${i + 1}) ${d.theme} [${d.status}]`];
    if (d.options && d.options.length > 0) parts.push(`   選択肢：${d.options.join(' / ')}`);
    if (d.chosen) parts.push(`   選ばれた：${d.chosen}`);
    if (d.concern) parts.push(`   気にしておられる点：${d.concern}`);
    return parts.join('\n');
  });
  return `【AXELが把握しているご相談中の判断】\n${lines.join('\n')}`;
}

// ─── Detection helpers (used by the engine after a turn) ──────────────

/**
 * From a user message, try to detect that they're LIVE-consulting a decision
 * — i.e. a new judgment theme worth journalling.
 *
 * Returns theme + options + concern if detected, else null.
 */
export function detectDecisionOpen(userText: string): {
  theme: string;
  options?: string[];
  concern?: string;
} | null {
  // Very conservative — only fire when the user uses explicit
  // decision-forming vocabulary. Prevents us from opening a journal
  // entry every time someone chats casually.
  const themePatterns: [RegExp, string][] = [
    [/組織(拡大|縮小|再編)/, '組織の判断'],
    [/(採用|増員|新規採用).{0,20}(判断|悩|決め|検討)/, '採用の判断'],
    [/(資金調達|シリーズ[ABCD]|エクイティ|エクイティ調達).{0,20}(判断|悩|決め|検討|タイミング)/, '資金調達の判断'],
    [/(ピボット|方向転換|事業転換).{0,20}(判断|悩|決め|検討)/, '事業転換の判断'],
    [/(事業承継|後継|世代交代).{0,20}(判断|悩|決め|検討)/, '事業承継の判断'],
    [/(提携|パートナー|アライアンス).{0,20}(判断|悩|決め|検討)/, '提携の判断'],
    [/(退任|辞任|CEO交代|社長交代).{0,20}(判断|悩|決め|検討)/, '経営体制の判断'],
    [/(M&A|買収|売却).{0,20}(判断|悩|決め|検討)/, 'M&Aの判断'],
  ];
  for (const [re, theme] of themePatterns) {
    if (re.test(userText)) {
      return { theme, options: parseOptions(userText), concern: parseConcern(userText) };
    }
  }
  // Fallback: "○○で悩んでいる/迷っている/判断できない" — accept as decision theme
  const generic = userText.match(/([^\s。、]{4,25})(?:で悩んで|で迷って|の判断|を決め|の意思決定)/);
  if (generic) {
    return { theme: generic[1].trim(), options: parseOptions(userText), concern: parseConcern(userText) };
  }
  return null;
}

/**
 * Detect "I chose X" from user text.
 * Returns the chosen option string or null.
 */
export function detectDecisionMade(userText: string): string | null {
  const m = userText.match(/([^\s。、]{2,25})(?:に決め|にしました|で行く|で進める|を選[びん]|で確定)/);
  if (m) {
    const cleaned = m[1].replace(/^(結局|やっぱり|最終的に|悩んだ末に)/, '').trim();
    if (cleaned.length >= 2) return cleaned;
  }
  return null;
}

/**
 * Detect the user reporting the outcome of a decision.
 * Returns the outcome text or null.
 */
export function detectDecisionOutcome(userText: string): string | null {
  const positives = /(うまく|良かった|良い方向|進んで|軌道|好調|順調)/;
  const negatives = /(思ったより|想定と違|うまくいか|難航|停滞|遅れ|失敗|撤退)/;
  if (positives.test(userText) && /(あの|例の|先日の|この前の)/.test(userText)) {
    return userText.slice(0, 80);
  }
  if (negatives.test(userText) && /(あの|例の|先日の|この前の)/.test(userText)) {
    return userText.slice(0, 80);
  }
  return null;
}

// ─── Internal helpers ─────────────────────────────────────────────────

function futureIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function normalizeTheme(s: string): string {
  return s.replace(/\s+/g, '').replace(/[のをでにとがは]/g, '').toLowerCase();
}

function parseOptions(text: string): string[] | undefined {
  // "AかB", "A、B、C", "A or B" style
  const m = text.match(/([一-鿿ぁ-ゖァ-ヺA-Za-z0-9]{2,15})[か、]([一-鿿ぁ-ゖァ-ヺA-Za-z0-9]{2,15})(?:[か、]([一-鿿ぁ-ゖァ-ヺA-Za-z0-9]{2,15}))?/);
  if (!m) return undefined;
  return [m[1], m[2], m[3]].filter(Boolean).map((x) => x!.trim());
}

function parseConcern(text: string): string | undefined {
  const m = text.match(/([^\s。、]{4,40})(?:が気になる|が気がかり|が心配|が引っかか)/);
  if (m) return m[1].trim();
  return undefined;
}
