/**
 * AXEL Deterministic Fallback Responder
 * ─────────────────────────────────────────────────────────────────────
 *
 * Used when OpenAI is unavailable (quota exhausted, network failure,
 * timeout, etc). Produces context-aware intimate-tone responses
 * WITHOUT calling the AI, by combining:
 *   - what we already know about the user (onboarding + recent logs)
 *   - the knowledge layer (gene → constitution, goal → tips)
 *   - the kind of interaction (text, button shortcut, greeting, etc)
 *
 * This means: even during a complete OpenAI outage, AXEL still feels
 * like the close-friend concierge the client described — it just uses
 * pre-curated templates instead of generative AI.
 *
 * Tone: intimate (○○さん, casual mix of ですます and だ調, no 様, no 敬語).
 */

import {
  detectHealthGoal,
  insightsForHealthGoal,
  humanizeConstitution,
  detectJudgmentTheme,
  insightsForJudgmentTheme,
  type HealthGoalKey,
} from './axelKnowledge';
import type { OnboardingAnswers } from './lineConversationStore';
import type { ConsultationMemory } from './axelMemory';
import type { DecisionEntry } from './axelDecisionJournal';

export interface FallbackInput {
  kind:
    | 'text'
    | 'open_chat_shortcut'
    | 'check_in_shortcut'
    | 'reflection_request'
    | 'first_greeting'
    | 'check_in_complete'
    | 'check_in_reply';
  text?: string;
  stateLevel?: number;
  fatigueLevel?: number;
  memo?: string | null;
  onboarding: OnboardingAnswers | null;
  geneRaw: any | null;
  recentStateLevel?: number | null;
  recentFatigueLevel?: number | null;
  recentTopics?: string[];
  daysSinceLastInteraction?: number | null;
  /** For open_chat_shortcut: what domain the button pre-selected. */
  focus?: 'general' | 'health' | 'judgment';
  /** Digested memories of past consultations (newest first). */
  memories?: ConsultationMemory[];
  /** Live decisions on file (OPEN or CHOSEN). */
  activeDecisions?: DecisionEntry[];
  /** Decision AXEL should proactively check back on right now, if any. */
  pendingFollowUp?: DecisionEntry | null;
}

/** Name suffix per intimate-tone policy. */
function callBy(o: OnboardingAnswers | null): string {
  return o?.name ? `${o.name}さん` : '';
}

/**
 * Detect a VAGUE consultation intent typed as free text —
 * 「判断について相談したい」「健康のことで話したい」「ちょっと相談いい？」.
 *
 * Client requirement (2026-07-07): these must open exactly like the
 * corresponding rich-menu button — with a proactive reference to what
 * AXEL already knows — NOT with 「どんな話か聞かせて」 from zero.
 *
 * Returns the inferred focus, or null when:
 *   - the text doesn't express a consult/talk intent, or
 *   - a concrete topic is already present (睡眠/資金調達 etc.) — then the
 *     topic-specific layers give a better, already-proactive response.
 */
export function detectConsultIntentFocus(
  text: string,
): 'health' | 'judgment' | 'general' | null {
  const t = text.trim();
  if (!t || t.length > 40) return null;
  // Completed/reported/gratitude aspect → a statement ABOUT a conversation
  // (「部下の相談を受けた」「話を聞いてくれてありがとう」), not a request to
  // start one.
  if (/(くれた|もらった|もらえた|できた|できて|受けた|乗った|乗ってた|言われた|聞いた|ありがとう)/.test(t)) {
    return null;
  }
  // Desiderative/request forms only — a bare 相談/話 + case particle is too
  // loose (「いい話を聞いた」「上司から話がある」 are not requests to AXEL).
  const wantsConsult =
    /相談(したい|したく|させて|に乗って(ほしい|欲しい|もらえ|くれ)|を?お願い|です|なんだけど|があるんだけど|がある|いい|できる|できます)/.test(t) ||
    /話(を|が)?(したい|したく|ある)/.test(t) ||
    /聞いて(ほしい|欲しい|もらえ)/.test(t);
  if (!wantsConsult) return null;
  // Concrete topic already stated → topic-specific responders handle it.
  if (detectHealthGoal(t)) return null;
  if (detectJudgmentTheme(t) !== 'generic') return null;
  if (/判断|意思決定|決断|経営|ビジネス|仕事のこと/.test(t)) return 'judgment';
  if (/健康|体調|身体|体の/.test(t)) return 'health';
  // Bare general intent — measure content AFTER stripping filler so
  // 「ちょっと相談したいことがあって、聞いてもらえる?」 still qualifies.
  const stripped = t.replace(/[ちょっと少しすみません、。！!？?\s]/g, '');
  return stripped.length <= 20 ? 'general' : null;
}

/**
 * Reduce a stored currentBusiness value (often a verb phrase like
 * 「今はSaaSプロダクトを運営」 or junk like 「従業員30名」) to a noun usable in a
 * guess（「SaaSプロダクトのこと?」）. Returns null when no clean noun remains.
 */
export function bizGuessNoun(currentBusiness: string | null | undefined): string | null {
  if (!currentBusiness) return null;
  let b = currentBusiness.replace(/^(今は|現在は|うちは)/, '');
  b = b.replace(/を?(運営|経営|やって(いる)?|提供|進めて(いる)?)$/, '');
  b = b.replace(/の(会社|事業)$/, '').trim();
  if (!b || b.length < 2 || /^従業員\d+名$/.test(b)) return null;
  return b;
}

/** Reduce a tai-form health goal（「集中力を保ちたい」）to its noun（「集中力」）. */
export function goalNoun(goal: string): string {
  return goal.replace(/を?(整えたい|残したくない|保ちたい|良くしたい|伸ばしたい|つけたい|したい)$/, '');
}

/** Pick the freshest real consultation memory matching a tag. */
function freshMemoryByTag(
  memories: ConsultationMemory[],
  tag: string,
): ConsultationMemory | null {
  return (
    memories.find(
      (m) =>
        m.tags?.includes(tag) &&
        m.topic &&
        m.topic !== 'ふとした会話' &&
        m.topic !== '一言だけの記録',
    ) ?? null
  );
}

/**
 * "I know you" opener — drawn from any of the 13 profile facts, ordered by
 * how naturally each fits at the start of a conversation.
 *
 * Priority order (most natural first):
 *   1. Pending follow-up ("あの件、その後どう?")
 *   2. Latest memory topic ("この前の○○の続きで話す?")
 *   3. Current decision theme in flight
 *   4. Thinking style (very safe, always applies)
 *   5. Health goal being worked on
 *   6. Business phase / current business
 *   7. Future goal / values
 *   8. Family or hobbies (private — softer touch)
 */
function knownYouOpener(
  o: OnboardingAnswers | null,
  recentState: number | null = null,
  memories: ConsultationMemory[] = [],
  pending: DecisionEntry | null = null,
): string {
  const parts: string[] = [];

  // 1. Proactive follow-up on a live decision
  if (pending) {
    parts.push(`${pending.theme}の件、その後どう?`);
  }

  // 2. Most-recent REAL consultation memory (check-in records and idle chat
  //    are not conversation topics to resume)
  const lastConsult = memories.find(
    (m) => m.topic && m.topic !== 'ふとした会話' && m.topic !== '一言だけの記録',
  );
  if (lastConsult) {
    parts.push(`この前の${lastConsult.topic}の続きになるけど`);
  }

  // 3. Active theme in flight
  if (o?.decisionTheme) {
    parts.push(`${o.decisionTheme}が頭にあると思うけど`);
  }

  // 4. Thinking style — safe, always applies
  if (o?.thinkingStyle && o.thinkingStyle !== '未選択') {
    parts.push(`${o.thinkingStyle}で物事を見るあなただから`);
  }

  // 5. Personality
  if (o?.personality) {
    parts.push(`${o.personality}なあなたなら`);
  }

  // 6. Recent state
  if (recentState != null && recentState >= 4) {
    parts.push('最近お疲れみたいだから');
  } else if (recentState != null && recentState <= 2) {
    parts.push('今日は調子良さそうだから');
  }

  // 7. Health goals
  if (o?.healthGoals && o.healthGoals.length > 0) {
    parts.push(`${o.healthGoals[0]}って気にしてたよね`);
  }

  // 8. Business context
  if (o?.currentBusiness) {
    parts.push(`${o.currentBusiness}のこと考えると`);
  } else if (o?.stage) {
    parts.push(`${o.stage}のフェーズだから`);
  }

  // 9. Future goals
  if (o?.futureGoals) {
    parts.push(`${o.futureGoals}を目指してる立場から`);
  }

  // 10. Values
  if (o?.values) {
    parts.push(`${o.values}を大事にしてるあなたなら`);
  }

  // 11. Hobbies / lifestyle
  if (o?.hobbiesLifestyle) {
    parts.push(`${o.hobbiesLifestyle}の時間、大事にしてたよね`);
  }

  // 12. Family — private, use gently
  if (o?.familyContext) {
    parts.push(`家族のこと、頭にあると思うけど`);
  }

  return parts[0] ?? '';
}

// ─────────────────────────────────────────────────────────────────────
// Per-kind generators
// ─────────────────────────────────────────────────────────────────────

function firstGreeting(): string {
  return [
    'はじめまして、AXEL です。',
    'これからよろしくお願いします。',
    '',
    'いちばん親しい間柄の相談相手として、迷った時にいつでも声をかけてもらえる存在になりたいと思ってる。',
    '',
    'まず、なんて呼んだらいいかな？',
  ].join('\n');
}

function openChatShortcut(
  o: OnboardingAnswers | null,
  memories: ConsultationMemory[] = [],
  pending: DecisionEntry | null = null,
  focus: 'general' | 'health' | 'judgment' = 'general',
): string {
  const name = callBy(o);
  const opener = knownYouOpener(o, null, memories, pending);

  // Focus-specific opening framing
  if (focus === 'health') {
    // Priority: fresh consultation memory (最近の話題) > stored goal > acknowledgment.
    // Client's model sentence: 「最近は睡眠も気にされていましたよね」— that comes
    // from MEMORY of past consultations, not only from the stored goal list.
    const healthMem = freshMemoryByTag(memories, '健康');
    const healthTip = o?.healthGoals && o.healthGoals.length > 0 ? o.healthGoals[0] : null;
    const namePref = name ? `${name}、` : '';
    if (healthMem && healthTip) {
      return `${namePref}最近は${healthMem.topic.replace(/のこと$/, '')}のことも気にしてたよね。\nその続きでも、${goalNoun(healthTip)}の話でも、今日はどこから一緒に考えようか。`;
    }
    if (healthMem) {
      return `${namePref}この前の${healthMem.topic}、その後どう?\n今日の調子も含めて、聞かせて。`;
    }
    if (healthTip) {
      return `${namePref}${healthTip}って話してたよね。\n今日の調子はどう?その件でも、別のことでも聞かせて。`;
    }
    return `${namePref}健康のこと、ちゃんと向き合おうとしてるんだね。\n今いちばん気になってる体調のこと、そのまま聞かせて。`;
  }
  if (focus === 'judgment') {
    const namePref = name ? `${name}、` : '';
    if (pending) {
      return name
        ? `${name}、${pending.theme}の件、その後どう?\nあれから考えてる中で、気になることがあれば聞かせて。`
        : `${pending.theme}の件、その後どう?`;
    }
    // Two knowledge sources → offer both as gentle guesses, per the client's
    // 「会社のことかな？」「新しい企画についてかな？」model.
    const bizNoun = bizGuessNoun(o?.currentBusiness);
    if (o?.decisionTheme && bizNoun) {
      return `${namePref}${o.decisionTheme}の件かな?それとも${bizNoun}のこと?\n今、頭にあること、聞かせて。`;
    }
    if (o?.decisionTheme) {
      return name
        ? `${name}、${o.decisionTheme}の件かな。\n今、頭の中で気になってること、聞かせて。`
        : `${o.decisionTheme}の件、今どうなってる?`;
    }
    const bizMem = freshMemoryByTag(memories, '経営');
    if (bizMem) {
      return `${namePref}この前の${bizMem.topic}の続きかな?\nあれから考えてること、聞かせて。`;
    }
    if (bizNoun) {
      return `${namePref}${bizNoun}のことかな?\n最近いろいろ考えてたよね。今、頭にあること聞かせて。`;
    }
    // 「最近いろいろ考えてたよね」 is a claim of shared history — only make it
    // when at least SOME history exists. A first-touch user gets a
    // knowledge-free warm opener instead.
    if (memories.length > 0) {
      return `${namePref}最近いろいろ考えてたよね。\n判断で迷ってること、今、頭の中にあるまま聞かせて。`;
    }
    return `${namePref}判断のことだね。どんな段階のものでも大丈夫。\n今、頭の中にあるまま聞かせて。`;
  }

  // General focus (default) — same as before
  // Highest priority: follow up on a decision
  if (pending) {
    return name
      ? `${name}、${pending.theme}の件、その後どう?\nあれから考えてる中で、気になることがあれば聞かせて。`
      : `${pending.theme}の件、その後どう?\nあれから考えてることがあれば聞かせて。`;
  }
  // Second: pick up from where we left off (real consultations only —
  // check-in records and idle chat are not topics to resume)
  const lastConsult = memories.find(
    (m) => m.topic && m.topic !== 'ふとした会話' && m.topic !== '一言だけの記録',
  );
  if (lastConsult) {
    const prev = lastConsult.topic.replace(/のこと$/, '');
    return name
      ? `${name}、この前の${prev}の続きでも、別の話でも構わない。\n今、頭にあること、聞かせて。`
      : `この前の${prev}の続きでも、別の話でも構わない。今、頭にあること、聞かせて。`;
  }
  // Third: knows-you opener from profile
  if (name && opener) {
    return `${name}、${opener}、今日はどんなこと考えてる?\n話したいこと、聞かせて。`;
  }
  if (name) {
    return `${name}、どうした？\n話したいこと、聞かせて。`;
  }
  return 'どうした？何かあった？\n話したいこと、聞かせて。';
}

function checkInShortcut(
  o: OnboardingAnswers | null,
  recentState: number | null = null,
  memories: ConsultationMemory[] = [],
  pending: DecisionEntry | null = null,
): string {
  const name = callBy(o);

  // If a live decision is in the air, we can weave that in gently
  if (pending) {
    return name
      ? `${name}、今日の調子はどう?\n${pending.theme}の件も、今日のコンディションと合わせて考えたいから、まず今日のあなたを聞かせて。`
      : `今日の調子はどう?\n判断中の件も、コンディション次第だから、まず今日のあなたを聞かせて。`;
  }

  // Recent fatigue on record — lead with concern
  if (recentState != null && recentState >= 4) {
    return name
      ? `${name}、最近お疲れみたいだったけど、今日はどんな感じ?\n少しでも軽くなってるといいけど。`
      : '最近お疲れみたいだったけど、今日はどんな感じ?';
  }

  // Otherwise use whatever knows-you angle we have
  const opener = knownYouOpener(o, recentState, memories, null);
  if (name && opener) {
    return `${name}、${opener}、今日の調子はどう?`;
  }
  return name ? `${name}、今日どうだった？お疲れは出てない？` : '今日どうだった？お疲れは出てない？';
}

function reflectionRequest(
  o: OnboardingAnswers | null,
  recentState: number | null,
  recentFatigue: number | null,
  daysSinceLastInteraction: number | null,
  memories: ConsultationMemory[] = [],
  activeDecisions: DecisionEntry[] = [],
): string {
  const name = callBy(o);
  const lines: string[] = [];

  if (daysSinceLastInteraction != null && daysSinceLastInteraction >= 14) {
    lines.push(`${name ? name + '、' : ''}しばらく話せてなかったね。`);
    lines.push('最近の様子、まだあまり伺えてないから、ここからまた知っていきたい。');
    lines.push('今いちばん気になってること、聞かせて。');
    return lines.join('\n');
  }

  // What we know about them — draw on the full 13-field profile
  if (name) lines.push(`${name}についてここまで見えてること、まとめるね。`);
  else lines.push('ここまで見えてること、まとめるね。');

  const characteristics: string[] = [];
  if (o?.thinkingStyle && o.thinkingStyle !== '未選択') {
    characteristics.push(`${o.thinkingStyle}で物事を見るタイプ`);
  }
  if (o?.personality) {
    characteristics.push(`${o.personality}な性格`);
  }
  if (o?.currentBusiness) {
    characteristics.push(`${o.currentBusiness}を進めてる`);
  } else if (o?.stage) {
    characteristics.push(`${o.stage}のフェーズ`);
  }
  if (o?.decisionTheme) {
    characteristics.push(`いまは${o.decisionTheme}が気がかり`);
  }
  if (o?.futureGoals) {
    characteristics.push(`${o.futureGoals}を目指してる`);
  }
  if (o?.healthGoals && o.healthGoals.length > 0) {
    characteristics.push(`${o.healthGoals.slice(0, 2).join('と')}を気にしてる`);
  }
  if (o?.hobbiesLifestyle) {
    characteristics.push(`${o.hobbiesLifestyle}が趣味`);
  }
  if (characteristics.length > 0) {
    // Show up to 6 characteristics so the full "I know you" understanding
    // comes across. Beyond 6, the sentence becomes too long to read.
    lines.push(characteristics.slice(0, 6).join('、') + '──こんな感じだと思ってる。');
  }

  // Reference past consultations if we have them
  if (memories.length >= 2) {
    const topics = memories
      .filter((m) => m.topic && m.topic !== 'ふとした会話' && m.topic !== '一言だけの記録')
      .slice(0, 2)
      .map((m) => m.topic);
    if (topics.length > 0) {
      lines.push(`最近は${topics.join('と')}のことで話してたね。`);
    }
  }

  // Reference decisions in flight
  if (activeDecisions.length > 0) {
    const d = activeDecisions[0];
    if (d.status === 'CHOSEN') {
      lines.push(`${d.theme}は${d.chosen}で進めてる最中だから、その後の様子も気になってる。`);
    } else if (d.status === 'OPEN') {
      lines.push(`${d.theme}の件は、まだ判断の最中だと思ってる。`);
    }
  }

  if (recentState != null && recentState >= 4) {
    lines.push('最近のコンディションは重そうで、ちょっと心配してた。');
  } else if (recentFatigue != null && recentFatigue >= 4) {
    lines.push('疲労が強そうな日が続いてるね。');
  } else if (recentState != null && recentState <= 2) {
    lines.push('最近は調子も良さそうで、嬉しい。');
  }

  if (characteristics.length === 0 && recentState == null && memories.length === 0) {
    // No data at all
    lines.push('まだあまり話せてないから、これからもっと知っていきたい。');
  }

  lines.push('');
  lines.push('ここから気になることがあれば、聞かせて。');
  return lines.join('\n');
}

/**
 * The reply RIGHT AFTER the user tapped 一言だけ and sent their state as
 * natural text. Must acknowledge AND bridge to further conversation.
 * This is the direct fix to the client's "その先の価値が見えない" complaint.
 */
function checkInReply(
  o: OnboardingAnswers | null,
  userText: string,
  memories: ConsultationMemory[],
  pending: DecisionEntry | null,
): string {
  const name = callBy(o);
  const namePref = name ? `${name}、` : '';

  // How they seem to feel
  const heavy = /(疲|しんど|きつい|重い|だる|眠れ|寝不足|忙し)/.test(userText);
  const good = /(調子いい|元気|快調|よく寝|前向き|落ち着い)/.test(userText);
  const neutral = !heavy && !good;

  const parts: string[] = [];

  // 1. Acknowledgement matched to their state
  if (heavy) {
    parts.push(`${namePref}教えてくれてありがとう。今日は無理しないでね。`);
  } else if (good) {
    parts.push(`${namePref}今日は調子良さそうで、嬉しい。`);
  } else {
    parts.push(`${namePref}今日のこと、教えてくれてありがとう。`);
  }

  // 2. Concrete linkage to a stored theme / memory / pending decision
  if (pending) {
    if (heavy) {
      parts.push(`${pending.theme}の件は、今日のコンディションだと一旦置いてもいいと思う。`);
    } else {
      parts.push(`${pending.theme}の件、その後どう感じてる？`);
    }
  } else if (o?.decisionTheme) {
    if (heavy) {
      parts.push(`${o.decisionTheme}の件も、今日のうちは一旦置いていいと思う。`);
    } else {
      parts.push(`${o.decisionTheme}の件、今の頭の中で気になってることがあれば聞かせて。`);
    }
  } else if (memories.length > 0 && memories[0].topic && memories[0].topic !== 'ふとした会話' && memories[0].topic !== '一言だけの記録') {
    parts.push(`この前の${memories[0].topic}の話、続きが気になってたら聞かせて。`);
  } else if (o?.healthGoals && o.healthGoals.length > 0 && !heavy) {
    parts.push(`${o.healthGoals[0]}の方も、少しずつ整えていけたらと思ってる。`);
  }

  // 3. The bridge — always open a door to more
  if (heavy) {
    parts.push('今日は休んで、話したくなったらまたいつでも声かけて。');
  } else if (good) {
    parts.push('何か話したいこと、あったら聞かせて。');
  } else {
    parts.push('何か気になることがあれば、そのまま送ってくれれば大丈夫。');
  }

  return parts.join('\n');
}

function checkInComplete(
  o: OnboardingAnswers | null,
  stateLevel: number,
  fatigueLevel: number,
  memo: string | null,
): string {
  const name = callBy(o);
  const greet = name ? `${name}、教えてくれてありがとう。` : '教えてくれてありがとう。';
  let advice = '';

  if (stateLevel >= 4 || fatigueLevel >= 4) {
    advice = '今日はちょっと重そうだね。無理せず、急ぎじゃない判断は明日に持ち越して大丈夫。';
    if (o?.decisionTheme) {
      advice += `\n${o.decisionTheme}の件も、今日のコンディションだと一旦置いた方がいいかも。`;
    }
  } else if (stateLevel <= 2 && fatigueLevel <= 2) {
    advice = '今日は調子良さそうで嬉しい。長期視座が必要な判断、進めるならいいタイミングかも。';
    if (o?.decisionTheme) {
      advice += `\n${o.decisionTheme}の件、今日のうちに一歩進めるのも良さそう。`;
    }
  } else {
    advice = '気になることがあれば、いつでも話して。';
  }

  return `${greet}\n\n${advice}`;
}

/**
 * Casual/small-talk reception — the missing layer that made "今、時間ある？"
 * fall through to a topic-probing default response.
 *
 * A close-friend concierge does NOT respond to every message as if it were
 * a consultation topic. Greetings, availability checks, and short emotional
 * one-liners should be received naturally:
 *   ・「今、時間ある？」→ 「もちろん、どうした？」
 *   ・「こんにちは」  → 「こんにちは、○○さん」
 *   ・「疲れた」     → 「お疲れさま。無理してない?」
 *
 * Returns a natural response string if the text is casual, else null.
 * Detection is conservative — only fires for very-short or clearly
 * greeting-shaped inputs. Substantive text still flows to the AI/topic path.
 */
function receiveCasualTalk(
  text: string,
  o: OnboardingAnswers | null,
): string | null {
  const t = text.trim();
  if (!t) return null;
  const name = callBy(o);
  const namePref = name ? `${name}、` : '';
  const bareName = name || 'あなた';

  // ── 1. Availability / "do you have a minute" checks ──
  //   「今、時間ある？」「話せる？」「今、いい？」「ちょっといい？」「大丈夫?」
  if (t.length <= 25 && /(今.{0,5}時間|話せ|話す時間|いい\?|大丈夫\?|ちょっといい|少しいい|話し?かけて)/.test(t)) {
    // Warm, immediate availability confirmation + open door
    if (name) {
      return `もちろん、${bareName}。\nどうした？何かあった?`;
    }
    return 'もちろん、いつでも。\nどうした？何かあった?';
  }

  // ── 2. Greetings ──
  if (/^(こんにちは|こんばんは|おはよう(?:ございます)?|やあ|よう)[!！。\s]*$/.test(t)) {
    const timeOfDay =
      /^おはよう/.test(t) ? 'おはよう' :
      /^こんばんは/.test(t) ? 'こんばんは' :
      'こんにちは';
    if (name) {
      return `${timeOfDay}、${bareName}。\n今日はどう?何か話したいことある?`;
    }
    return `${timeOfDay}。\nどう?何か話したいことある?`;
  }

  // ── 3. Simple mood one-liners ──
  //   「疲れた」「しんどい」「眠い」「元気ない」
  if (/^(疲れた|しんどい|眠い|だるい|元気ない|しんど|きつい)[。\s]*$/.test(t) || (t.length <= 12 && /(疲|しんど|きつい|眠い|だる)/.test(t))) {
    if (name) {
      return `${namePref}お疲れさま。\n無理してない?何があったのか、少しだけ聞かせて。`;
    }
    return 'お疲れさま。\n無理してない?何があったのか、少しだけ聞かせて。';
  }

  //   「嬉しい」「楽しい」「良かった」
  if (/^(嬉しい|楽しい|よかった|良かった|最高|ハッピー)[。！!\s]*$/.test(t)) {
    if (name) {
      return `${namePref}嬉しそうで、こっちも嬉しい。\n何があったの?聞かせて。`;
    }
    return 'その言葉、こっちも嬉しい。\n何があったのか、聞かせて。';
  }

  // ── 4. Yes/No, acknowledgements, thanks ──
  if (/^(うん|はい|ええ|そう|そうだね|うんうん)[。\s]*$/.test(t)) {
    return name ? `${namePref}それで、続きは?` : 'それで、続きは?';
  }
  if (/^(ありがとう|感謝|助かった|助かる|ありがとうございます)[。！!\s]*$/.test(t)) {
    if (name) {
      return `${namePref}こちらこそ。\nいつでも声かけてね。`;
    }
    return 'こちらこそ。\nいつでも声かけて。';
  }

  // ── 5. Casual sign-offs ──
  if (/^(おやすみ|おやすみなさい|また|また明日|バイバイ|じゃあね)[。\s]*$/.test(t)) {
    if (/おやすみ/.test(t)) {
      return name ? `${namePref}おやすみ。\nゆっくり休んでね。` : 'おやすみ。\nゆっくり休んでね。';
    }
    return name ? `${namePref}また話そう。` : 'また話そう。';
  }

  // ── 6. Very short check-in that's not covered above ──
  //   「元気？」「調子どう?」「何してる？」
  if (t.length <= 15 && /(元気|調子|どう\?|何して)/.test(t)) {
    if (name) {
      return `${namePref}こっちは大丈夫。\nそっちはどう?何かあった?`;
    }
    return 'こっちは大丈夫。\nそっちはどう?何かあった?';
  }

  return null;
}

function genericTextResponse(input: FallbackInput): string {
  const {
    text = '',
    onboarding: o,
    geneRaw,
    recentStateLevel,
    memories = [],
    pendingFollowUp = null,
  } = input;
  const name = callBy(o);

  // ── Casual/small-talk reception — must run FIRST so short casual openers
  //     never get probed as "topics to explore". This is the client's core
  //     complaint (「今、時間ある?」→ 「その話、もう少し聞かせて」) directly. ──
  const casual = receiveCasualTalk(text, o);
  if (casual) return casual;

  // ── Meta question detection ──
  const isMeta =
    /AXEL.*(何|どんな|違|超|どう違|比較|MyAI|ChatGPT|サブスク|価値|意味|存在|サービス|目指|出来る|できる|なる)/.test(text) ||
    /他のAI|他のサービス/.test(text);
  if (isMeta) {
    return metaQuestionResponse(o);
  }

  // ── Vague consultation intent (「判断について相談したい」etc.) ──
  // Must open exactly like the corresponding menu button: proactively,
  // from what AXEL already knows — never 「どんな話か聞かせて」 from zero.
  const consultFocus = detectConsultIntentFocus(text);
  if (consultFocus) {
    return openChatShortcut(o, memories, pendingFollowUp, consultFocus);
  }

  // ── Health goal detection ──
  const goal = detectHealthGoal(text);
  if (goal) {
    return healthGoalResponse(goal, o, geneRaw);
  }

  // ── Judgment theme detection ──
  const theme = detectJudgmentTheme(text);
  if (theme !== 'generic') {
    return judgmentThemeResponse(theme, o);
  }

  // ── Extended fatigue mentions (not covered by casual reception above) ──
  if (/疲|だる|しんど/.test(text)) {
    return name
      ? `${name}、お疲れさま。最近のことも考えるとちょっと心配。今日は無理しないで、休めるなら休んで欲しい。`
      : 'お疲れさま。今日は無理しないで、休めるなら休んで欲しい。';
  }

  // ── Default: warm acknowledgement that uses knownYouOpener ──
  // pending is deliberately NOT passed here: its phrase（「○○の件、その後どう?」）
  // is a complete sentence and cannot be spliced mid-sentence below.
  const opener = knownYouOpener(o, recentStateLevel ?? null, memories, null);
  if (name && opener) {
    return `${name}、${opener}、その話、もう少し聞かせて。\nどのあたりが今いちばん気になってる？`;
  }
  if (name) {
    return `${name}、その話、もう少し聞かせて。\nどのあたりが今いちばん気になってる？`;
  }
  return 'その話、もう少し聞かせて。\nどのあたりが今いちばん気になってる？';
}

function metaQuestionResponse(o: OnboardingAnswers | null): string {
  const name = callBy(o);
  const opener = name ? `${name}、` : '';
  return [
    `${opener}AXEL は、いちばん親しい間柄の相談相手として作ってる。`,
    '汎用のチャットAIと違うのは、あなたの性格、価値観、健康面のこと、相談履歴、これらを全部覚えた上で話せること。',
    '',
    'たとえば「今のあなたなら、こう判断する方がいいかな」「今日のコンディションだと、これは明日に回そう」「飛距離を伸ばしたいなら、これを優先しよう」みたいに、その人だけに向けた言葉を返せる。',
    '',
    '正直、まだ育ってる途中だから、これから一緒に磨いていけたら嬉しい。',
  ].join('\n');
}

function healthGoalResponse(
  goal: HealthGoalKey,
  o: OnboardingAnswers | null,
  geneRaw: any | null,
): string {
  const name = callBy(o);
  const tips = insightsForHealthGoal(goal, geneRaw);
  const tip = tips[0] ?? '';
  const constitution = humanizeConstitution(geneRaw);
  const constitutionPhrase = constitution[0] ?? '';

  const goalLabel: Record<HealthGoalKey, string> = {
    weight_loss: '体重・体型のこと',
    sleep: '睡眠のこと',
    fatigue: '疲労のこと',
    focus: '集中力のこと',
    skin: '肌のこと',
    aging: '若々しさのこと',
    sports_distance: '飛距離や運動パフォーマンスのこと',
    sports_endurance: '持久力のこと',
    muscle_gain: '筋肉のこと',
  };

  const opening = name
    ? `${name}、${goalLabel[goal]}、気にしてるんだね。`
    : `${goalLabel[goal]}、気にしてるんだね。`;

  let body = '';
  if (constitutionPhrase) {
    body = `${constitutionPhrase}から、`;
  }
  if (tip) {
    body += `まず${tip}`;
  }

  return [opening, '', body || '少しずつ一緒に整えていけたらと思ってる。', '', 'これでどう感じる？'].join('\n');
}

function judgmentThemeResponse(theme: ReturnType<typeof detectJudgmentTheme>, o: OnboardingAnswers | null): string {
  const name = callBy(o);
  const insights = insightsForJudgmentTheme(theme, o?.thinkingStyle, o?.stage);
  const insight = insights[0] ?? '';

  const themeLabel: Record<string, string> = {
    organization_expansion: '組織拡大',
    fundraising: '資金調達',
    pivot: 'ピボット',
    succession: '事業承継',
    partnership: '提携・M&A',
    leadership: 'リーダーシップ',
    work_life: 'ワークライフ',
    family: '家族のこと',
  };

  const opening = name
    ? `${name}、${themeLabel[theme] ?? 'その判断'}の話だね。`
    : `${themeLabel[theme] ?? 'その判断'}の話だね。`;

  let perspective = '';
  if (o?.thinkingStyle && o.thinkingStyle !== '未選択') {
    perspective = `${o.thinkingStyle}のあなたなら、`;
  } else {
    perspective = 'あなたなら、';
  }

  if (insight) {
    perspective += insight;
  }

  return [opening, '', perspective, '', 'どの辺りでいちばん迷ってる？'].join('\n');
}

// ─────────────────────────────────────────────────────────────────────
// Public entry
// ─────────────────────────────────────────────────────────────────────

/**
 * Generate an intimate-tone response without calling OpenAI.
 * Used as a fallback when the AI is unavailable.
 */
export function generateFallbackResponse(input: FallbackInput): string {
  const memories = input.memories ?? [];
  const pending = input.pendingFollowUp ?? null;
  const active = input.activeDecisions ?? [];
  switch (input.kind) {
    case 'first_greeting':
      return firstGreeting();
    case 'open_chat_shortcut':
      return openChatShortcut(input.onboarding, memories, pending, input.focus ?? 'general');
    case 'check_in_shortcut':
      return checkInShortcut(input.onboarding, input.recentStateLevel ?? null, memories, pending);
    case 'reflection_request':
      return reflectionRequest(
        input.onboarding,
        input.recentStateLevel ?? null,
        input.recentFatigueLevel ?? null,
        input.daysSinceLastInteraction ?? null,
        memories,
        active,
      );
    case 'check_in_complete':
      return checkInComplete(
        input.onboarding,
        input.stateLevel ?? 3,
        input.fatigueLevel ?? 3,
        input.memo ?? null,
      );
    case 'check_in_reply':
      return checkInReply(
        input.onboarding,
        input.text ?? '',
        memories,
        pending,
      );
    case 'text':
    default:
      return genericTextResponse(input);
  }
}
