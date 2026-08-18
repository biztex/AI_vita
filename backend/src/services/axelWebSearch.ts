/**
 * Web search for AXEL (2026-08-04, client-commissioned).
 *
 * Additive, gated pre-step to respondAsAxel. When a text turn needs current
 * or external facts, this fetches an authoritative, officially-sourced brief
 * via the OpenAI Responses API `web_search` tool, and returns it as a context
 * block to inject into the main system prompt. The main personalized reply is
 * still produced by the existing chat.completions engine — so all of AXEL's
 * understanding (profile, memory, genetics, dietitian notes, decision journal)
 * is woven together with the fresh facts, and the whole tested reply path is
 * preserved.
 *
 * Design contract (client spec 1):
 *  - official / public / primary sources prioritised (instruction-steered)
 *  - citations surfaced (url_citation annotations → 参照元 list)
 *  - fact vs inference vs unknown kept distinct (persona freshness rule + here)
 *  - the model decides whether a search is warranted (returns NO_SEARCH if not)
 *  - fully fail-safe: any error returns null and AXEL falls back to its
 *    freshness-honesty behavior (never blocks or breaks a reply)
 */

import OpenAI from 'openai';
import { ENV } from '../env';

const client = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export interface WebSearchResult {
  /** Context block to inject into the system prompt (already LINE-safe text). */
  block: string;
  /** Sources for deterministic citation display: [{title, url}]. */
  citations: { title: string; url: string }[];
}

const NO_SEARCH = 'NO_SEARCH';

// Cost gate: skip a flagship search call on turns that plainly need no external
// facts (greetings, thanks, pure feelings, very short quips). This never decides
// the ANSWER — only whether to spend a search call. Anything substantive passes
// through to the model, which makes the real search/no-search judgment.
const TRIVIAL = /^(おはよう|こんにちは|こんばんは|やあ|よろ|ありがと|thanks?|ok|おやすみ|ただいま|お疲れ|おつかれ|うん|はい|いいえ|そう|わかった|了解|👍|😊)/i;

function looksTrivial(text: string): boolean {
  const t = text.trim();
  if (t.length <= 6 && !t.includes('?') && !t.includes('？')) return true;
  if (TRIVIAL.test(t) && t.length <= 20) return true;
  return false;
}

const RESEARCH_INSTRUCTION = [
  'あなたはAXELというコンシェルジュのためのリサーチ補助です。',
  'ユーザーの相談に、最新の状況や、時間で変わる外部の固有事実（今の開催・募集の有無、価格、制度の変更、営業状況、在庫、評判など）が本当に必要な場合のみ、Web検索を行ってください。',
  '検索する場合は、公式サイト・公的機関・一次情報など信頼性の高い情報源を優先し、日本語で要点だけを簡潔にまとめてください。',
  // Official-source discipline (added after an audit found the tool surfacing
  // lookalike/impostor subsidy sites and the model labeling them 公式).
  '補助金・給付金・行政手続き・公的制度・税・法令など公的な事柄では、政府・自治体の公式ドメイン（go.jp / lg.jp、例：中小企業庁 chusho.meti.go.jp、jGrants jgrants-portal.go.jp、国税庁 nta.go.jp）の情報のみを「公式」として扱ってください。',
  '.info や .com などの非公式ドメインを「公式」「公式の申込先」と絶対に呼ばないでください。紛らわしい類似ドメイン（偽サイト）が上位に出ることがあるため、公式ドメインで裏が取れない場合は、URLを断定的に案内せず「◯◯（制度名）で検索し、政府・自治体の公式サイトで確認してください」と案内し、偽サイトに注意するよう一言添えてください。',
  '公式ドメインで確認できた事実と、非公式情報・推測・一般論は必ず区別し、確認できないことは「確認できない」と明示してください。',
  '末尾に、参照した情報源を「・（名称） （URL）」形式で列挙してください。公式ドメインを先に挙げてください。',
  'マークダウン記法（#、**、---、表）は使わないでください。',
  `外部の事実確認が不要な相談（雑談・気持ち・一般常識・計算・すでに分かっている前提の相談）や、用語・資格・制度の一般的な意味や定義を尋ねる質問（「〜とは」「どんな資格?」など、最新の募集・価格・要件変更を求めていないもの）は、検索せず「${NO_SEARCH}」だけを返してください。定義や一般的な説明は自分の知識で自然に答えるほうが良く、そこに検索結果や出典リストは不要です。`,
].join('\n');

/** Strips tracking params (utm_*, fbclid, gclid) the search tool appends. */
function cleanUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) {
      if (/^utm_/i.test(k) || k === 'fbclid' || k === 'gclid') u.searchParams.delete(k);
    }
    return u.toString();
  } catch {
    return url.replace(/[?&]utm_source=[^&]*/gi, '');
  }
}

function extract(resp: any): { searched: boolean; text: string; citations: { title: string; url: string }[] } {
  let searched = false;
  let text = '';
  const citations: { title: string; url: string }[] = [];
  const seen = new Set<string>();
  const add = (rawUrl: string, title: string) => {
    const url = cleanUrl(rawUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    citations.push({ title: (title ?? '').slice(0, 80), url });
  };
  for (const o of resp?.output ?? []) {
    if (o?.type === 'web_search_call') searched = true;
    if (o?.type === 'message') {
      for (const c of o?.content ?? []) {
        if (c?.type === 'output_text') {
          text += c.text ?? '';
          for (const a of c?.annotations ?? []) {
            if (a?.type === 'url_citation' && a.url) add(a.url, a.title ?? '');
          }
        }
      }
    }
  }
  // Fallback: the model sometimes writes sources into the text without emitting
  // structured annotations. Harvest bare URLs so citation display stays
  // deterministic whenever a search actually produced sources.
  if (searched) {
    for (const m of text.matchAll(/https?:\/\/[^\s　）)」】、,]+/g)) {
      add(m[0].replace(/[.。]+$/, ''), '');
    }
  }
  return { searched, text: text.trim(), citations };
}

/**
 * Returns a sourced-facts block for the given user text, or null if no search
 * was warranted / possible. Never throws.
 */
export async function researchIfNeeded(userText: string): Promise<WebSearchResult | null> {
  if (ENV.AXEL_WEB_SEARCH !== 'on') return null;
  if (!userText || looksTrivial(userText)) return null;

  try {
    const resp = await client.responses.create({
      model: ENV.AXEL_SEARCH_MODEL,
      tools: [{ type: 'web_search' as any }],
      instructions: RESEARCH_INSTRUCTION,
      input: userText.slice(0, 1500),
      max_output_tokens: 1800,
      reasoning: { effort: 'low' },
    } as any);

    const { searched, text, citations } = extract(resp);
    if (!searched || !text || text === NO_SEARCH || text.startsWith(NO_SEARCH)) {
      return null;
    }

    const today = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
    const block =
      `【最新情報（Web検索で確認・${today}時点）】\n` +
      `以下は、この相談のためにWebで確認した内容です。事実として使ってよいのはこの範囲に限り、` +
      `ここに無いことは断定せず、確認できない旨を正直に伝えてください。回答の中で、どの情報源に基づくかが分かるようにしてください。\n\n` +
      text;

    return { block, citations };
  } catch (err: any) {
    console.error('[axelWebSearch] search failed (non-fatal):', err?.code || err?.message || err);
    return null;
  }
}

/**
 * Appends a compact 参照元 list to a reply if citations exist and the reply
 * doesn't already surface a URL — guarantees the client's citation requirement
 * regardless of how the model phrased its answer.
 */
const isOfficial = (url: string) => /\.go\.jp(\/|$)|\.lg\.jp(\/|$)/.test(url);

export function appendCitations(reply: string, citations: { title: string; url: string }[]): string {
  if (!citations.length) return reply;
  if (/https?:\/\//.test(reply)) return reply; // model already showed sources
  // Official government domains first (client requirement: 公式・公的を優先).
  const ordered = [...citations].sort((a, b) => Number(isOfficial(b.url)) - Number(isOfficial(a.url)));
  const lines = ordered.slice(0, 4).map((c) => (c.title ? `・${c.title} ${c.url}` : `・${c.url}`));
  return `${reply}\n\n参照元：\n${lines.join('\n')}`;
}
