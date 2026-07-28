/**
 * Parse ExecuWell LLM reply into:
 * - shortSummary: 3–6 lines for LINE (結論先出し)
 * - sections: for LIFF (要点整理, 判断軸, リスク, 推奨アクション)
 */
export type ExecuWellSections = {
  summary10s: string;   // 10秒要約 → 要点整理
  conclusion: string;   // 結論
  reasons: string;      // 理由 → 判断軸
  risks: string;        // リスク
  actions: string;      // 推奨アクション
  supplement: string;   // 補足
};

function extractSection(content: string, startTag: string, endTag: string | null): string {
  const start = content.indexOf(startTag);
  if (start === -1) return '';
  const from = start + startTag.length;
  const end = endTag ? content.indexOf(endTag, from) : content.length;
  const raw = (end === -1 ? content.slice(from) : content.slice(from, end)).trim();
  return raw.replace(/^\n+|\n+$/g, '').trim();
}

/**
 * Parse full ExecuWell reply into structured sections (for LIFF).
 */
export function parseExecuWellReply(fullReply: string): ExecuWellSections {
  const summary10s = extractSection(fullReply, '【10秒要約】', '【結論】');
  const conclusion = extractSection(fullReply, '【結論】', '【理由】');
  const reasons = extractSection(fullReply, '【理由】', '【リスク】');
  const risks = extractSection(fullReply, '【リスク】', '【推奨アクション】');
  const actions = extractSection(fullReply, '【推奨アクション】', '【補足】');
  const supplement = extractSection(fullReply, '【補足】', null);

  return {
    summary10s,
    conclusion,
    reasons,
    risks,
    actions,
    supplement,
  };
}

const MAX_LINE_LENGTH = 80;
const MAX_LINES = 6;
const MIN_LINES = 3;

function cleanLine(s: string): string {
  return s
    .replace(/^[・\-–—\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toLines(block: string): string[] {
  return block
    .split(/\n/)
    .map((l) => cleanLine(l))
    .filter(Boolean)
    .flatMap((l) => (l.length > MAX_LINE_LENGTH ? [l.slice(0, MAX_LINE_LENGTH - 1) + '…'] : [l]));
}

/**
 * Build short reply for LINE: 3–6 lines, conclusion first (結論先出し).
 * Uses 【10秒要約】+【結論】, truncated to max 6 lines.
 */
export function buildLineShortReply(fullReply: string): string {
  const { summary10s, conclusion, actions, risks } = parseExecuWellReply(fullReply);

  const parts: string[] = [];
  if (conclusion.trim()) {
    parts.push(...toLines(conclusion).slice(0, 2));
  }
  if (summary10s.trim() && parts.length < MAX_LINES) {
    for (const line of toLines(summary10s)) {
      if (parts.length >= MAX_LINES) break;
      parts.push(line);
    }
  }

  // Ensure minimum 3 lines by adding 1 action or risk line (still no greetings).
  if (parts.length < MIN_LINES && actions.trim()) {
    for (const line of toLines(actions)) {
      if (parts.length >= MIN_LINES) break;
      parts.push(line);
    }
  }
  if (parts.length < MIN_LINES && risks.trim()) {
    for (const line of toLines(risks)) {
      if (parts.length >= MIN_LINES) break;
      parts.push(line);
    }
  }

  if (parts.length === 0) {
    // Fallback: first non-empty lines of full reply, max 6 lines
    const lines = toLines(fullReply).slice(0, MAX_LINES);
    return lines.join('\n').slice(0, 400) || fullReply.slice(0, 400);
  }

  // De-duplicate identical lines and enforce 3–6 lines.
  const uniq: string[] = [];
  for (const p of parts) {
    if (uniq.length >= MAX_LINES) break;
    if (uniq.includes(p)) continue;
    uniq.push(p);
  }
  const joined = uniq.slice(0, MAX_LINES).join('\n');
  return joined.length > 500 ? joined.slice(0, 497) + '...' : joined;
}
