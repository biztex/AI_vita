import OpenAI from 'openai';
import { ENV } from '../env.js';
import type { NewsItem } from './newsService.js';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export async function analyzeBusinessItemsJA(items: NewsItem[]): Promise<string> {
  const list = items
    .map((n, i) => `(${i + 1}) タイトル: ${n.title}\n要約: ${n.description}\nリンク: ${n.link}`)
    .join('\n\n');

  const system = `あなたは日本語で助言する経営コンサルタントです。短く実務的に、根拠を一言添えて示してください。`;
  const user = `以下は本日のビジネスニュースです。各項目について、\n- 経営への影響（1-2文）\n- 現状維持・安定運営のための方向性（2-3箇条書き）\nを出力してください。全体のまとめ（1-2文）も最後に付けてください。\n\n${list}\n\n出力形式:\n# 本日の示唆\n(1) ...\n- 方向性: ...\n- 方向性: ...\n(2) ...\n...\n\n## 全体まとめ\n...`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    max_tokens: 1200,
    temperature: 0.5,
  });

  const content = completion.choices[0]?.message?.content?.trim() || '';
  console.log(content);
  return content;
}

export function buildEmailContentJA(dateLabel: string, items: NewsItem[], analysis: string): { subject: string; text: string; html: string } {
  const subject = `本日のビジネスニュース・経営維持の示唆 (${dateLabel})`;
  const listLines = items
    .map((n) => `- ${n.title}\n  ${n.link}`)
    .join('\n');

  const text = `本日のニュース (${dateLabel})\n\n${listLines}\n\n---\n${analysis}`;

  const htmlItems = items
    .map((n) => `<li><strong>${escapeHtml(n.title)}</strong><br/><a href="${escapeAttr(n.link)}">${escapeHtml(n.link)}</a></li>`)
    .join('');

  const html = `
  <div>
    <h2>本日のニュース (${escapeHtml(dateLabel)})</h2>
    <ul>${htmlItems}</ul>
    <hr/>
    <pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(analysis)}</pre>
  </div>`;

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/"/g, '&quot;');
}


