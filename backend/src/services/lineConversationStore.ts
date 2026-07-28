/**
 * Lightweight file-backed key/value store for per-LINE-user conversation state.
 *
 * Used to drive the in-LINE state machine (conversational onboarding, daily-log
 * multi-step capture, etc.) WITHOUT requiring a schema migration on the
 * production database.
 *
 * Persistence model:
 *  - In-memory Map is the source of truth at runtime (fast, sync).
 *  - On every mutation we async-flush the full Map to a single JSON file.
 *  - On boot we synchronously load the file (small; ~1KB per user).
 *
 * Storage location is overrideable via env AXEL_STATE_FILE (default
 * /var/lib/axel/conversation_state.json with a /tmp fallback if the
 * directory isn't writable).
 */
import * as fs from 'fs';
import * as path from 'path';

export type AxelConversationPhase =
  | 'IDLE'
  | 'ONBOARDING_NAME'
  | 'ONBOARDING_STAGE'
  | 'ONBOARDING_VALUES'
  | 'ONBOARDING_DECISION_THEME'
  | 'ONBOARDING_HEALTH_GOALS'
  | 'ONBOARDING_THINKING_STYLE'
  | 'ONBOARDING_COMPLETED'
  | 'DAILY_LOG_STATE'
  | 'DAILY_LOG_FATIGUE'
  | 'DAILY_LOG_MEMO';

/**
 * The 13-item profile the client explicitly asked AXEL to accumulate and
 * carry forward across every conversation. These are the facts an
 * "いちばん親しい間柄の専属コンシェルジュ" is expected to already know.
 *
 * All fields are optional — profile learning is incremental and organic:
 * AXEL picks these up from natural conversation, never through a form.
 */
export interface OnboardingAnswers {
  // ── Original 6 fields (kept for back-compat) ──
  name?: string;
  stage?: string;             // 創業期 / 拡大期 / 安定期 / 転換期 / その他
  values?: string;            // 大切にされている価値観（自由記述）
  decisionTheme?: string;     // 今の相談テーマ
  healthGoals?: string[];     // 疲労回復 / 睡眠 / 集中力 / 体型 / etc
  thinkingStyle?: string;     // 戦略型 / 分析型 / 直感型 / 共感型

  // ── 7 new fields, one per client-listed item ──
  /** 性格特性 — 落ち着き、率直さ、責任感の強さ、慎重さ、大胆さ、など */
  personality?: string;
  /** 経歴・実績 — 起業経験、業界歴、これまでの成功/失敗、資格、など */
  background?: string;
  /** 現在の事業 — 業種、モデル、組織規模、直近のフォーカス */
  currentBusiness?: string;
  /** 将来目標 — 3〜10年後のビジョン、EXIT観、実現したい社会など */
  futureGoals?: string;
  /** 趣味・ライフスタイル — 週の過ごし方、運動、旅行、読書、家族時間 */
  hobbiesLifestyle?: string;
  /** 家族構成 — 配偶者、子ども、両親、ペット、同居状況（自発発話のみ） */
  familyContext?: string;
  /** 管理栄養士からのコメント — VitaAI/栄養士側の申し送り */
  dietitianNote?: string;

  // ── Metadata ──
  completedAt?: string;       // ISO timestamp (legacy; no longer required)
}

export interface DailyLogDraft {
  stateLevel?: number;
  fatigueLevel?: number;
}

/**
 * Per-user persona preferences — how AXEL should speak to THIS person.
 * Client requirement (2026-07-14 §3): 呼び方・距離感・励まし方・回答の詳しさ
 * should adapt per user. Learned from conversation (「もっと砕けた感じでいい」
 * 「社長って呼んで」) by the understanding pipeline.
 */
export interface PersonaPrefs {
  /** 呼び方 — overrides the default 「名前+さん」 (e.g. 「かおるさん」「社長」). */
  addressAs?: string;
  /** 口調・距離感 — e.g. 「砕けた友人口調」「落ち着いた丁寧め」. */
  tone?: string;
  /** 回答の詳しさ — e.g. 「結論だけ短く」「背景も含めて詳しく」. */
  detail?: string;
  /** 励まし方 — e.g. 「静かに背中を押す」「根拠で安心させる」. */
  encouragement?: string;
}

export interface AxelConversationState {
  phase: AxelConversationPhase;
  onboarding?: OnboardingAnswers;
  dailyLog?: DailyLogDraft;
  /** Last "I understand you" message timestamp — used to throttle re-sending it. */
  trustContractSentAt?: string;
  /** How AXEL should speak to this person (learned, per-user). */
  personaPrefs?: PersonaPrefs;
  /**
   * Free-form running understanding that doesn't fit the 13 structured items —
   * short observations written by the understanding pipeline, newest last.
   */
  understandingNotes?: string;
}

// ── File-path resolution ──
const PREFERRED = process.env.AXEL_STATE_FILE || '/var/lib/axel/conversation_state.json';
const FALLBACK = '/tmp/axel_conversation_state.json';

function resolveStateFile(): string {
  try {
    const dir = path.dirname(PREFERRED);
    fs.mkdirSync(dir, { recursive: true });
    // Touch a probe file to ensure we can actually write here.
    const probe = path.join(dir, '.axel_write_probe');
    fs.writeFileSync(probe, '');
    fs.unlinkSync(probe);
    return PREFERRED;
  } catch {
    return FALLBACK;
  }
}

const STATE_FILE = resolveStateFile();

// ── In-memory store ──
const store = new Map<string, AxelConversationState>();
let loaded = false;
let pendingFlush: NodeJS.Timeout | null = null;

function loadIfNeeded(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, AxelConversationState>;
      for (const [k, v] of Object.entries(parsed)) {
        if (v && typeof v === 'object') store.set(k, v);
      }
      console.log(`[lineConversationStore] Loaded ${store.size} state entries from ${STATE_FILE}`);
    } else {
      console.log(`[lineConversationStore] No existing state file at ${STATE_FILE} (starting fresh)`);
    }
  } catch (err) {
    console.error('[lineConversationStore] Failed to load state file:', err);
  }
}

function scheduleFlush(): void {
  // Coalesce burst writes; flush 200ms after the last mutation.
  if (pendingFlush) clearTimeout(pendingFlush);
  pendingFlush = setTimeout(() => {
    pendingFlush = null;
    try {
      const obj: Record<string, AxelConversationState> = {};
      store.forEach((v, k) => (obj[k] = v));
      fs.writeFileSync(STATE_FILE, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
      console.error('[lineConversationStore] Failed to flush state:', err);
    }
  }, 200);
}

export function getConversationState(lineUserId: string): AxelConversationState | null {
  loadIfNeeded();
  return store.get(lineUserId) ?? null;
}

export function setConversationState(lineUserId: string, state: AxelConversationState): void {
  loadIfNeeded();
  store.set(lineUserId, state);
  scheduleFlush();
}

export function updateConversationState(
  lineUserId: string,
  patch: Partial<AxelConversationState> & {
    onboarding?: Partial<OnboardingAnswers>;
    dailyLog?: Partial<DailyLogDraft>;
    personaPrefs?: Partial<PersonaPrefs>;
  },
): AxelConversationState {
  loadIfNeeded();
  const current: AxelConversationState = store.get(lineUserId) ?? { phase: 'IDLE' };
  const next: AxelConversationState = { ...current, ...patch };
  if (patch.onboarding) {
    next.onboarding = { ...(current.onboarding ?? {}), ...patch.onboarding };
  }
  if (patch.dailyLog) {
    next.dailyLog = { ...(current.dailyLog ?? {}), ...patch.dailyLog };
  }
  if (patch.personaPrefs) {
    next.personaPrefs = { ...(current.personaPrefs ?? {}), ...patch.personaPrefs };
  }
  store.set(lineUserId, next);
  scheduleFlush();
  return next;
}

export function clearConversationState(lineUserId: string): void {
  loadIfNeeded();
  if (store.delete(lineUserId)) scheduleFlush();
}

/**
 * Reset ONLY the transient conversation phase (check-in capture etc.),
 * preserving everything AXEL has learned: the 13-item profile, persona
 * preferences, understanding notes, and the trust-contract marker.
 *
 * This exists because clearConversationState() deletes the WHOLE entry —
 * using it to consume a check-in phase silently erased the user's entire
 * understanding document every time (found 2026-07-15). Never use
 * clearConversationState for phase transitions.
 */
export function clearTransientPhase(lineUserId: string): void {
  loadIfNeeded();
  const cur = store.get(lineUserId);
  if (!cur) return;
  const next: AxelConversationState = { ...cur, phase: 'IDLE' };
  delete next.dailyLog;
  store.set(lineUserId, next);
  scheduleFlush();
}

/**
 * Has any profile understanding accumulated for this user?
 * Returns true if we know at least one fact (name, theme, goal, style).
 * The old "completedAt" flag is no longer required — conversation-first
 * profile learning builds understanding incrementally.
 */
export function isOnboarded(lineUserId: string): boolean {
  const a = getOnboardingAnswers(lineUserId);
  if (!a) return false;
  return !!(
    a.name ||
    a.decisionTheme ||
    (a.thinkingStyle && a.thinkingStyle !== '未選択') ||
    (a.healthGoals && a.healthGoals.length > 0) ||
    a.personality ||
    a.background ||
    a.currentBusiness ||
    a.futureGoals ||
    a.hobbiesLifestyle ||
    a.familyContext ||
    a.dietitianNote
  );
}

/**
 * Rough count of how many profile "facts" AXEL currently knows about this
 * user. Used to shape the "I know you" opener — the more we know, the more
 * confidently we can reference our understanding.
 */
export function countProfileFacts(a: OnboardingAnswers | null): number {
  if (!a) return 0;
  let n = 0;
  if (a.name) n++;
  if (a.stage) n++;
  if (a.values) n++;
  if (a.decisionTheme) n++;
  if (a.healthGoals && a.healthGoals.length > 0) n++;
  if (a.thinkingStyle && a.thinkingStyle !== '未選択') n++;
  if (a.personality) n++;
  if (a.background) n++;
  if (a.currentBusiness) n++;
  if (a.futureGoals) n++;
  if (a.hobbiesLifestyle) n++;
  if (a.familyContext) n++;
  if (a.dietitianNote) n++;
  return n;
}

/**
 * Get any onboarding answers we have learned so far (may be partial).
 * Returns null only if no facts have been captured yet.
 */
export function getOnboardingAnswers(lineUserId: string): OnboardingAnswers | null {
  const s = getConversationState(lineUserId);
  if (!s?.onboarding) return null;
  const o = s.onboarding;
  // If absolutely nothing is set across ALL 13 fields, return null
  const hasAnything =
    o.name ||
    o.decisionTheme ||
    o.thinkingStyle ||
    o.values ||
    o.stage ||
    (o.healthGoals && o.healthGoals.length > 0) ||
    o.personality ||
    o.background ||
    o.currentBusiness ||
    o.futureGoals ||
    o.hobbiesLifestyle ||
    o.familyContext ||
    o.dietitianNote;
  if (!hasAnything) return null;
  return o;
}
