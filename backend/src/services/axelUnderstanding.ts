/**
 * AXEL Understanding Pipeline
 * ─────────────────────────────────────────────────────────────────────
 *
 * "利用者を深く理解した専属コンシェルジュ" requires understanding that is
 * actually deep enough to show. This module maintains that understanding.
 *
 * After every meaningful exchange, an async LLM pass reads the exchange
 * plus the current understanding and returns updates to:
 *   - the 13-item structured profile (lineConversationStore.onboarding)
 *   - persona preferences (呼び方・口調・詳しさ・励まし方)
 *   - free-form understanding notes (observations that fit no field)
 *   - the consultation memory (topic / gist / feeling / tags)
 *   - the decision journal (opened / chosen / outcome)
 *
 * This REPLACES the old regex extractors + heuristicSummarise on the
 * success path. The regexes live on here as the OUTAGE FALLBACK only —
 * when the updater model call fails, we degrade to the old heuristics so
 * continuity never fully stops.
 *
 * Design rules for the updater prompt:
 *   - Extract only what the user actually said or clearly confirmed.
 *   - Never promote inference to fact.
 *   - Values stay short; the understanding is a working document, not a log.
 */

import OpenAI from 'openai';
import { ENV } from '../env';
import { tuningParams } from './openaiParams';
import {
  updateConversationState,
  getConversationState,
  type OnboardingAnswers,
  type PersonaPrefs,
} from './lineConversationStore';
import {
  addMemory,
  recentMemories,
  heuristicSummarise,
  isWorthRemembering,
  setOpenThread,
  type ConsultationMemory,
} from './axelMemory';
import {
  openDecision,
  markChosen,
  markOutcome,
  detectDecisionOpen,
  detectDecisionMade,
  detectDecisionOutcome,
  activeDecisions as fetchActiveDecisions,
  type DecisionEntry,
} from './axelDecisionJournal';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────────────
// Update shape returned by the LLM (all fields optional)
// ─────────────────────────────────────────────────────────────────────

export interface UnderstandingUpdate {
  profile?: Partial<OnboardingAnswers>;
  personaPrefs?: Partial<PersonaPrefs>;
  /** One short new observation that fits no structured field, or null. */
  noteAppend?: string | null;
  /** Digest of this exchange for the consultation memory, or null if not worth keeping. */
  memory?: {
    topic: string;
    gist: string;
    feeling?: string;
    followUp?: boolean;
    tags?: string[];
  } | null;
  /** A decision the user newly opened this turn. */
  decisionOpened?: { theme: string; concern?: string } | null;
  /** What the user decided, if they reported making a decision. */
  decisionChosen?: string | null;
  /** Outcome the user reported for a past decision. */
  decisionOutcome?: string | null;
}

// dietitianNote is deliberately EXCLUDED: it is written only by the
// ExecuWell-payload ingestion (axelEngine). Accepting it from the updater
// model would let a hallucinated value permanently block the real note
// (fill-once semantics).
const PROFILE_KEYS: (keyof OnboardingAnswers)[] = [
  'name', 'stage', 'values', 'decisionTheme', 'healthGoals', 'thinkingStyle',
  'personality', 'background', 'currentBusiness', 'futureGoals',
  'hobbiesLifestyle', 'familyContext',
];
const PREF_KEYS: (keyof PersonaPrefs)[] = ['addressAs', 'tone', 'detail', 'encouragement'];

/** Parse + sanitize the raw LLM JSON into a safe UnderstandingUpdate. */
export function parseUnderstandingJson(raw: string): UnderstandingUpdate {
  const out: UnderstandingUpdate = {};
  let j: any;
  try {
    j = JSON.parse(raw);
  } catch {
    return out;
  }
  if (j && typeof j === 'object') {
    if (j.profile && typeof j.profile === 'object') {
      const p: Partial<OnboardingAnswers> = {};
      for (const k of PROFILE_KEYS) {
        const v = j.profile[k];
        if (k === 'healthGoals') {
          if (Array.isArray(v)) {
            const goals = v.filter((g: any) => typeof g === 'string' && g.trim()).map((g: string) => g.trim().slice(0, 40));
            if (goals.length > 0) p.healthGoals = goals.slice(0, 6);
          }
        } else if (typeof v === 'string' && v.trim()) {
          (p as any)[k] = v.trim().slice(0, 120);
        }
      }
      if (Object.keys(p).length > 0) out.profile = p;
    }
    if (j.personaPrefs && typeof j.personaPrefs === 'object') {
      const pp: Partial<PersonaPrefs> = {};
      for (const k of PREF_KEYS) {
        const v = j.personaPrefs[k];
        if (typeof v === 'string' && v.trim()) pp[k] = v.trim().slice(0, 60);
      }
      if (Object.keys(pp).length > 0) out.personaPrefs = pp;
    }
    if (typeof j.noteAppend === 'string' && j.noteAppend.trim()) {
      out.noteAppend = j.noteAppend.trim().slice(0, 120);
    }
    if (j.memory && typeof j.memory === 'object' && typeof j.memory.topic === 'string' && j.memory.topic.trim()) {
      out.memory = {
        topic: j.memory.topic.trim().slice(0, 40),
        gist: typeof j.memory.gist === 'string' ? j.memory.gist.trim().slice(0, 160) : '',
        feeling: typeof j.memory.feeling === 'string' && j.memory.feeling.trim() ? j.memory.feeling.trim().slice(0, 20) : undefined,
        followUp: j.memory.followUp === true,
        tags: Array.isArray(j.memory.tags)
          ? j.memory.tags.filter((t: any) => ['経営', '健康', '家族', '仕事'].includes(t))
          : undefined,
      };
    }
    if (j.decisionOpened && typeof j.decisionOpened === 'object' && typeof j.decisionOpened.theme === 'string' && j.decisionOpened.theme.trim()) {
      out.decisionOpened = {
        theme: j.decisionOpened.theme.trim().slice(0, 50),
        concern: typeof j.decisionOpened.concern === 'string' ? j.decisionOpened.concern.trim().slice(0, 100) : undefined,
      };
    }
    if (typeof j.decisionChosen === 'string' && j.decisionChosen.trim()) {
      out.decisionChosen = j.decisionChosen.trim().slice(0, 100);
    }
    if (typeof j.decisionOutcome === 'string' && j.decisionOutcome.trim()) {
      out.decisionOutcome = j.decisionOutcome.trim().slice(0, 100);
    }
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// Merge rules (moved from axelEngine; paraphrase-hardened 2026-07-15)
// ─────────────────────────────────────────────────────────────────────

/** Normalize a phrase for fuzzy comparison (strip punctuation/whitespace). */
function normKey(s: string): string {
  return s.replace(/[\s、。・「」!！?？〜ー]/g, '');
}

/** Are two phrases the same topic, allowing paraphrase containment? */
function samePhrase(a: string, b: string): boolean {
  const na = normKey(a);
  const nb = normKey(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

const MAX_HEALTH_GOALS = 8;

export function mergeProfileUpdates(
  existing: OnboardingAnswers | undefined,
  updates: Partial<OnboardingAnswers>,
): Partial<OnboardingAnswers> {
  const out: Partial<OnboardingAnswers> = {};
  // Fill-once fields: only accept updates when we don't already have the value
  if (updates.name && !existing?.name) out.name = updates.name;
  if (updates.thinkingStyle && !existing?.thinkingStyle) out.thinkingStyle = updates.thinkingStyle;
  if (updates.values && !existing?.values) out.values = updates.values;
  if (updates.stage && !existing?.stage) out.stage = updates.stage;
  if (updates.personality && !existing?.personality) out.personality = updates.personality;
  if (updates.background && !existing?.background) out.background = updates.background;
  if (updates.currentBusiness && !existing?.currentBusiness) out.currentBusiness = updates.currentBusiness;
  if (updates.futureGoals && !existing?.futureGoals) out.futureGoals = updates.futureGoals;
  if (updates.hobbiesLifestyle && !existing?.hobbiesLifestyle) out.hobbiesLifestyle = updates.hobbiesLifestyle;
  if (updates.familyContext && !existing?.familyContext) out.familyContext = updates.familyContext;
  if (updates.dietitianNote && !existing?.dietitianNote) out.dietitianNote = updates.dietitianNote;
  // Latest-wins field — but a PARAPHRASE of the current theme is not a new
  // theme. The updater re-digests every turn of a multi-turn consult; without
  // this guard the theme rewrites itself turn-to-turn with rewordings.
  if (
    updates.decisionTheme &&
    (!existing?.decisionTheme || !samePhrase(updates.decisionTheme, existing.decisionTheme))
  ) {
    out.decisionTheme = updates.decisionTheme;
  }
  // Accumulating set: union with paraphrase-dedup, newest-kept, bounded.
  if (updates.healthGoals && updates.healthGoals.length > 0) {
    const merged: string[] = [...(existing?.healthGoals ?? [])];
    for (const g of updates.healthGoals) {
      if (!merged.some((e) => samePhrase(e, g))) merged.push(g);
    }
    if (merged.length > (existing?.healthGoals?.length ?? 0)) {
      out.healthGoals = merged.slice(-MAX_HEALTH_GOALS);
    }
  }
  return out;
}

const MAX_NOTES_CHARS = 600;

/**
 * Apply a (parsed, sanitized) update to the stores. Exported for tests.
 */
export function applyUnderstandingUpdate(
  lineUserId: string,
  u: UnderstandingUpdate,
  existingOnboarding: OnboardingAnswers | null,
  activeDecisions: DecisionEntry[],
): void {
  // 1. Structured profile
  if (u.profile) {
    const merged = mergeProfileUpdates(existingOnboarding ?? undefined, u.profile);
    if (Object.keys(merged).length > 0) {
      updateConversationState(lineUserId, { onboarding: merged });
    }
  }

  // 2. Persona preferences — latest wins (the user is telling us how to speak)
  if (u.personaPrefs && Object.keys(u.personaPrefs).length > 0) {
    updateConversationState(lineUserId, { personaPrefs: u.personaPrefs });
  }

  // 3. Free-form notes — append (skip repeats), keep the tail at a bullet boundary
  if (u.noteAppend) {
    const cur = getConversationState(lineUserId)?.understandingNotes ?? '';
    if (!cur.includes(u.noteAppend)) {
      let next = (cur ? cur + '\n' : '') + `・${u.noteAppend}`;
      if (next.length > MAX_NOTES_CHARS) {
        next = next.slice(next.length - MAX_NOTES_CHARS);
        // Trim the leading fragment so notes always start at a 「・」 bullet.
        const bullet = next.indexOf('・');
        if (bullet > 0) next = next.slice(bullet);
      }
      updateConversationState(lineUserId, { understandingNotes: next });
    }
  }

  // 4. Consultation memory — require a real gist, skip exact repeats of the
  //    most recent memory (a chatty updater must not churn the store).
  if (u.memory && u.memory.gist && u.memory.gist.trim()) {
    const last = recentMemories(lineUserId, 1)[0];
    const isRepeat = last && last.topic === u.memory.topic && last.gist === u.memory.gist;
    if (!isRepeat) {
      const m: ConsultationMemory = {
        at: new Date().toISOString(),
        topic: u.memory.topic,
        gist: u.memory.gist,
        feeling: u.memory.feeling,
        followUp: u.memory.followUp,
        tags: u.memory.tags,
      };
      addMemory(lineUserId, m);
    }
  }

  // 5. Decision journal.
  //    - A paraphrase of an already-OPEN theme is the SAME consult continuing,
  //      not a new decision — coalesce instead of duplicating entries.
  //    - Open+choose in the SAME message（「AとBで迷ってたけどAに決めた」）must
  //      mark the entry created this very call, not search a stale list.
  let openedEntry: DecisionEntry | null = null;
  if (u.decisionOpened) {
    const existingOpen = activeDecisions.find(
      (d) => d.status === 'OPEN' && samePhrase(d.theme, u.decisionOpened!.theme),
    );
    if (existingOpen) {
      openedEntry = existingOpen;
    } else {
      openedEntry = openDecision(lineUserId, u.decisionOpened.theme, {
        concern: u.decisionOpened.concern,
      });
      setOpenThread(lineUserId, { topic: openedEntry.theme, since: openedEntry.createdAt });
    }
  }
  if (u.decisionChosen) {
    const target = openedEntry ?? activeDecisions.find((d) => d.status === 'OPEN') ?? null;
    if (target) markChosen(lineUserId, target.id, u.decisionChosen);
  }
  if (u.decisionOutcome) {
    const chosen = activeDecisions.find((d) => d.status === 'CHOSEN');
    if (chosen) markOutcome(lineUserId, chosen.id, u.decisionOutcome);
  }
}

// ─────────────────────────────────────────────────────────────────────
// The updater prompt + entry point
// ─────────────────────────────────────────────────────────────────────

function buildUpdaterPrompt(
  onboarding: OnboardingAnswers | null,
  prefs: PersonaPrefs | null,
  notes: string | null,
): string {
  return [
    'あなたは、AIコンシェルジュ「AXEL」の理解記録係です。',
    '直近の一往復の会話を読み、AXELがこの利用者について新しく理解できたことだけを、JSONで返してください。',
    '',
    '【現在の理解（既知の情報は返さないこと）】',
    JSON.stringify({ profile: onboarding ?? {}, personaPrefs: prefs ?? {}, notes: notes ?? '' }, null, 0),
    '',
    '【返すJSONの形（全フィールド任意。新情報がなければ空オブジェクト {} を返す）】',
    '{',
    '  "profile": { "name":"呼び名", "stage":"事業フェーズ", "values":"価値観", "decisionTheme":"今の判断テーマ",',
    '    "healthGoals":["健康目標"], "thinkingStyle":"戦略型/分析型/直感型/共感型", "personality":"性格特性",',
    '    "background":"経歴・実績", "currentBusiness":"現在の事業", "futureGoals":"将来目標",',
    '    "hobbiesLifestyle":"趣味・ライフスタイル", "familyContext":"家族について" },',
    '  "personaPrefs": { "addressAs":"希望の呼ばれ方", "tone":"希望の口調・距離感", "detail":"回答の詳しさの希望", "encouragement":"合う励まし方" },',
    '  "noteAppend": "どの項目にも収まらない、1文の短い観察（なければ null）",',
    '  "memory": { "topic":"相談の主題(短く)", "gist":"要点1〜2文", "feeling":"気持ち", "followUp":true/false, "tags":["経営"|"健康"|"家族"|"仕事"] } または null,',
    '  "decisionOpened": { "theme":"新しく迷い始めた判断テーマ", "concern":"何に迷っているか" } または null,',
    '  "decisionChosen": "決めたと報告された内容" または null,',
    '  "decisionOutcome": "過去の判断の結果報告" または null',
    '}',
    '',
    '【厳守ルール】',
    '・利用者が実際に言ったこと、明確に肯定したことだけを抽出する。推測を事実にしない。',
    '・挨拶・雑談・お礼・短い相づちだけの往復なら、memory は null、他も空にする。',
    '・値は短く（各40文字以内、gistのみ160文字以内）。',
    '・personaPrefs は利用者が話し方への希望を伝えた時だけ（「もっと砕けていい」「〜って呼んで」等）。',
    '・decisionTheme は経営・仕事・人生の判断テーマのみ。健康の悩みは healthGoals へ。',
    '・decisionTheme と decisionOpened は、テーマが「新しく現れた」か「明確に変わった」時だけ返す。同じ相談の続きのターンでは null にする（言い換えは変化ではない）。',
    '・healthGoals は、既存の項目と同じ意味なら既存の文字列をそのまま使う。言い換えで別項目を作らない。',
    '・noteAppend は、既存の観察メモに無い「新しい」観察だけ。既出の内容の言い換えは null。',
  ].join('\n');
}

export interface UnderstandingRunArgs {
  lineUserId: string;
  userText: string;
  axelReply: string;
  onboarding: OnboardingAnswers | null;
  activeDecisions: DecisionEntry[];
}

/**
 * Run one understanding update. Called fire-and-forget after each text
 * exchange — never blocks the reply, never throws.
 */
export async function runUnderstandingUpdate(args: UnderstandingRunArgs): Promise<void> {
  const { lineUserId, userText, axelReply, onboarding, activeDecisions } = args;
  try {
    const state = getConversationState(lineUserId);
    const completion = await openai.chat.completions.create({
      model: ENV.AXEL_UPDATER_MODEL,
      messages: [
        { role: 'system', content: buildUpdaterPrompt(onboarding, state?.personaPrefs ?? null, state?.understandingNotes ?? null) },
        { role: 'user', content: `利用者：「${userText.slice(0, 600)}」\nAXEL：「${axelReply.slice(0, 600)}」` },
      ],
      response_format: { type: 'json_object' },
      // temperature 0 applies only to legacy models; reasoning-family models
      // run at their fixed default and rely on the prompt for discipline.
      ...(tuningParams(ENV.AXEL_UPDATER_MODEL, { maxTokens: 500, temperature: 0 }) as any),
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const update = parseUnderstandingJson(raw);
    // Backstop: pure greetings/thanks never become memories even if the
    // model ignores the null rule.
    if (update.memory && !isWorthRemembering(userText)) {
      update.memory = null;
    }
    // Re-read CURRENT state at apply time: this call is async and another
    // exchange may have updated the stores while the model ran — fill-once
    // and decision resolution must run against fresh state, not snapshots.
    const fresh = getConversationState(lineUserId)?.onboarding ?? onboarding;
    const freshDecisions = fetchActiveDecisions(lineUserId);
    applyUnderstandingUpdate(lineUserId, update, fresh, freshDecisions);
  } catch (err) {
    console.error('[axelUnderstanding] LLM update failed, using heuristic fallback:', (err as any)?.code || (err as any)?.message || err);
    try {
      runHeuristicUpdate(args);
    } catch (hErr) {
      console.error('[axelUnderstanding] Heuristic fallback also failed (non-fatal):', hErr);
    }
  }
}

/**
 * The old regex-based pipeline, kept as the outage fallback. Same behavior
 * the engine had before the understanding pipeline existed.
 */
export function runHeuristicUpdate(args: UnderstandingRunArgs): void {
  const { lineUserId, userText, axelReply, onboarding, activeDecisions } = args;

  const confirmed = extractProfileConfirmations(axelReply, userText);
  const merged = mergeProfileUpdates(onboarding ?? undefined, confirmed);
  if (Object.keys(merged).length > 0) {
    updateConversationState(lineUserId, { onboarding: merged });
  }

  if (isWorthRemembering(userText)) {
    const summary = heuristicSummarise(userText, axelReply);
    if (summary) addMemory(lineUserId, summary);
  }

  const detected = detectDecisionOpen(userText);
  if (detected) {
    const entry = openDecision(lineUserId, detected.theme, {
      options: detected.options,
      concern: detected.concern,
    });
    setOpenThread(lineUserId, { topic: entry.theme, since: entry.createdAt });
  }
  const chosen = detectDecisionMade(userText);
  if (chosen) {
    const open = activeDecisions.find((d) => d.status === 'OPEN');
    if (open) markChosen(lineUserId, open.id, chosen);
  }
  const outcome = detectDecisionOutcome(userText);
  if (outcome) {
    const chosenEntry = activeDecisions.find((d) => d.status === 'CHOSEN');
    if (chosenEntry) markOutcome(lineUserId, chosenEntry.id, outcome);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Heuristic extractors (moved verbatim from axelEngine — outage fallback)
// ─────────────────────────────────────────────────────────────────────

function extractNameFromUser(userText: string): string | null {
  const patterns = [
    /([一-鿿ぁ-ゖァ-ヺ]{2,8})と申します/,
    /([一-鿿ぁ-ゖァ-ヺ]{2,8})と呼んで/,
    /私(?:の名前)?は\s*([一-鿿ぁ-ゖァ-ヺ]{2,8})/,
    /([一-鿿ぁ-ゖァ-ヺ]{2,8})です(?:、よろしく)?/,
  ];
  for (const p of patterns) {
    const m = userText.match(p);
    if (m && m[1].length >= 2 && m[1].length <= 8) {
      if (!/^(私|自分|ここ|これ|それ|あれ|どこ|何か|今日|明日|昨日|そう|うん|はい|いいえ)/.test(m[1])) {
        return m[1];
      }
    }
  }
  return null;
}

function extractNameFromAi(aiResponse: string): string | null {
  const patterns = [
    /([一-鿿ぁ-ゖァ-ヺ]{1,8})様、と?呼ばせていただ/,
    /([一-鿿ぁ-ゖァ-ヺ]{1,8})様、お話/,
    /([一-鿿ぁ-ゖァ-ヺ]{1,8})様、よろしく/,
    /^([一-鿿ぁ-ゖァ-ヺ]{1,8})様/m,
  ];
  for (const p of patterns) {
    const m = aiResponse.match(p);
    if (m && m[1].length >= 1 && m[1].length <= 8) {
      if (!/^(あなた|これ|それ|皆|ご利用)/.test(m[1])) {
        return m[1];
      }
    }
  }
  return null;
}

function extractStageFromUser(userText: string): string | null {
  if (/創業|立ち上げたばかり/.test(userText)) return '創業期';
  if (/拡大|シリーズ[A-D]|採用中|組織拡大/.test(userText)) return '拡大期';
  if (/安定|安定期|落ち着/.test(userText)) return '安定期';
  if (/転換|ピボット|転機|事業承継|M&A/.test(userText)) return '転換期';
  return null;
}

function extractHealthGoals(userText: string, aiResponse: string): string[] {
  const combinedText = userText + ' ' + aiResponse;
  const goalPatterns = [
    { pattern: /痩|やせ|ダイエット|体重を|減量|体型/, label: '体重・体型を整えたい' },
    { pattern: /睡眠|寝つき|入眠|不眠|眠れ/, label: '睡眠を整えたい' },
    { pattern: /疲|だる|消耗|エネルギー切れ/, label: '疲労を残したくない' },
    { pattern: /集中|頭が回ら|頭がぼ/, label: '集中力を保ちたい' },
    { pattern: /シミ|しみ|そばかす|肌の|肌荒れ/, label: '肌の状態を良くしたい' },
    { pattern: /若々し|アンチエイジ|老化|シワ|しわ/, label: '若々しさを保ちたい' },
    { pattern: /飛距離|ゴルフ|スイング|スプリント/, label: '飛距離・運動パフォーマンス' },
    { pattern: /持久|マラソン|長距離/, label: '持久力を伸ばしたい' },
    { pattern: /筋肉|筋力|筋トレ/, label: '筋肉をつけたい' },
  ];
  const detected = new Set<string>();
  for (const { pattern, label } of goalPatterns) {
    if (pattern.test(combinedText)) detected.add(label);
  }
  return Array.from(detected);
}

function extractDecisionTheme(userText: string, aiResponse: string): string | null {
  const aiPatterns = [
    /([^\s]{4,30})(?:のテーマ|の件、ご一緒|について、ご一緒|でお悩み)/,
    /([^\s]{4,30})(?:を考えて|を整理)/,
  ];
  for (const p of aiPatterns) {
    const m = aiResponse.match(p);
    if (m && m[1].length >= 4 && m[1].length <= 50) {
      const cleaned = m[1].replace(/^(その|この|今|現在|最近の?|今回の?)/, '').trim();
      if (cleaned.length >= 4) return cleaned;
    }
  }
  const userMatch = userText.match(/([^\s。、]{4,30})(?:で悩んで|で迷って|について考え|について悩んで)/);
  if (userMatch && userMatch[1].length >= 4) {
    const captured = userMatch[1].trim();
    if (/^(睡眠|不眠|寝つき|疲労|疲れ|肌|肌荒れ|ダイエット|体重|体型|集中|集中力|眠気|冷え|むくみ|便秘|白髪|抜け毛)/.test(captured)) {
      return null;
    }
    return captured;
  }
  return null;
}

function extractThinkingStyleFromText(userText: string): string | null {
  if (/戦略的|長期視座|長期的に|3年後|5年後/.test(userText)) return '戦略型';
  if (/分析|データ|論理|整合|理屈/.test(userText)) return '分析型';
  if (/直感|感覚的|瞬発|閃き|閃いた/.test(userText)) return '直感型';
  if (/共感|関係性|寄り添|相手の気持ち/.test(userText)) return '共感型';
  return null;
}

function extractValuesFromText(userText: string): string | null {
  const patterns = [
    /([^\s。、「」]{2,30})(?:を大切に|を大事に|を信じて|を信条に|を軸に|を最優先に)/,
    /大切なのは([^\s。、「」]{2,30})/,
    /(?:私にとって|自分にとって)いちばん(?:大事|大切)なのは([^\s。、「」]{2,30})/,
    /([^\s。、「」]{2,30})(?:こそが|こそ)(?:大事|大切|全て)/,
  ];
  const HEALTH_REJECT = /^(睡眠|健康|体調|運動|食事|栄養|飲酒|禁煙|ダイエット|体重|体型|集中力|疲労|肌)/;
  for (const p of patterns) {
    const m = userText.match(p);
    if (m && m[1]) {
      const cleaned = m[1].replace(/^(その|この|やっぱり|結局|私は|自分は)/, '').trim();
      if (cleaned.length >= 2 && cleaned.length <= 30 && !HEALTH_REJECT.test(cleaned)) {
        return cleaned;
      }
    }
  }
  return null;
}

function extractPersonalityFromText(userText: string): string | null {
  const REJECT = /^(普通|そう|同じ|忙し|そんな|こんな|そういう|こういう|いろんな|色んな|素敵|優しい|大切|大事)$/;
  const m = userText.match(/(?:私は|自分は)([一-鿿ぁ-ゖァ-ヺ]{2,15})(?:な性格|なタイプ|寄りで|派で)/);
  if (m) {
    const v = m[1].trim();
    if (!REJECT.test(v)) return v;
  }
  if (/せっかち|慎重|大胆|保守的|理性的|感情的|楽観的|悲観的|冷静沈着|情熱的/.test(userText)) {
    const t = userText.match(/(せっかち|慎重|大胆|保守的|理性的|感情的|楽観的|悲観的|冷静沈着|情熱的)/);
    if (t) return t[1];
  }
  return null;
}

function extractBackgroundFromText(userText: string): string | null {
  const patterns = [
    /(\d+)年前に(起業|創業|立ち上げ)/,
    /(元|前職は|前は)([^\s。、]{3,25})/,
    /([一-鿿ぁ-ゖァ-ヺ]{2,15}業界).{0,10}(\d+)年/,
    /(MBA|博士|修士|CFA|USCPA|公認会計士|税理士|弁護士|医師)(?:取得|保有|持って)/,
  ];
  for (const p of patterns) {
    const m = userText.match(p);
    if (m) return m[0].slice(0, 40);
  }
  return null;
}

function extractCurrentBusinessFromText(userText: string): string | null {
  const patterns = [
    /(?:今は|現在は|うちは)([^\s。、]{4,30})(?:をやって|を経営|の会社|の事業|を運営)/,
    /([一-鿿ぁ-ゖァ-ヺ]{2,15})(?:サービス|プラットフォーム|プロダクト|SaaS)(?:を(?:提供|運営|やって))/,
    /従業員(\d+)名/,
  ];
  for (const p of patterns) {
    const m = userText.match(p);
    if (m) return m[0].slice(0, 50);
  }
  return null;
}

function extractFutureGoalsFromText(userText: string): string | null {
  const patterns = [
    /(\d+)年後(?:に|には)([^\s。、]{3,30})/,
    /(IPO|上場|EXIT|世界展開|事業売却)(?:したい|を目指|を狙|が目標)/,
    /(?:将来的?に|いずれ|最終的?に)([^\s。、]{4,40})(?:したい|を目指|になり)/,
  ];
  for (const p of patterns) {
    const m = userText.match(p);
    if (m) return m[0].slice(0, 60);
  }
  return null;
}

function extractHobbiesFromText(userText: string): string | null {
  const hobbies: [RegExp, string][] = [
    [/ゴルフ.{0,10}(好き|やって|通って|趣味)/, 'ゴルフ'],
    [/(サーフィン|スキー|スノーボード|登山|キャンプ).{0,10}(好き|やって|通って|趣味)/, ''],
    [/読書.{0,10}(好き|習慣|よくする)/, '読書'],
    [/(ワイン|日本酒|コーヒー|音楽|映画|アート).{0,10}(好き|集めて|通って)/, ''],
    [/(ジム|筋トレ|ランニング|ヨガ).{0,10}(通って|続けて|習慣|やって)/, ''],
  ];
  for (const [re, label] of hobbies) {
    const m = userText.match(re);
    if (m) return label || m[1];
  }
  return null;
}

function extractFamilyFromText(userText: string): string | null {
  const patterns = [
    /(妻|夫|嫁|旦那|パートナー)(?:は|が|と)/,
    /子ども(?:が|は)?(\d+)人/,
    /(息子|娘)(?:が|は)([一-鿿ぁ-ゖァ-ヺ0-9]{1,15}歳)/,
    /(両親|父|母|義父|義母|祖父|祖母)(?:と|は|が)/,
  ];
  for (const p of patterns) {
    const m = userText.match(p);
    if (m) return m[0].slice(0, 30);
  }
  return null;
}

export function extractProfileConfirmations(aiResponse: string, userText: string): Partial<OnboardingAnswers> {
  const updates: Partial<OnboardingAnswers> = {};

  const name = extractNameFromAi(aiResponse) ?? extractNameFromUser(userText);
  if (name) updates.name = name;

  const stage = extractStageFromUser(userText);
  if (stage) updates.stage = stage;

  const goals = extractHealthGoals(userText, aiResponse);
  if (goals.length > 0) updates.healthGoals = goals;

  const theme = extractDecisionTheme(userText, aiResponse);
  if (theme) updates.decisionTheme = theme;

  const ts = extractThinkingStyleFromText(userText);
  if (ts) updates.thinkingStyle = ts;

  const v = extractValuesFromText(userText);
  if (v) updates.values = v;

  const p = extractPersonalityFromText(userText);
  if (p) updates.personality = p;

  const bg = extractBackgroundFromText(userText);
  if (bg) updates.background = bg;

  const biz = extractCurrentBusinessFromText(userText);
  if (biz) updates.currentBusiness = biz;

  const fg = extractFutureGoalsFromText(userText);
  if (fg) updates.futureGoals = fg;

  const hobby = extractHobbiesFromText(userText);
  if (hobby) updates.hobbiesLifestyle = hobby;

  const fam = extractFamilyFromText(userText);
  if (fam) updates.familyContext = fam;

  return updates;
}
