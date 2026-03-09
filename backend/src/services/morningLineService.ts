/**
 * Morning LINE push – builds mode-specific "朝の一言" and pushes to all opted-in LINE users.
 * ExecuWell users get business news; VitaAI users get wellness tips.
 */
import { prisma } from '../prisma';
import OpenAI from 'openai';
import { ENV } from '../env';
import { pushText } from './lineService';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

// ── ExecuWell: business news snippet ──

async function buildBusinessSnippet(): Promise<string> {
  const latestNews = await prisma.newsItem.findMany({
    orderBy: { newsDate: 'desc' },
    take: 5,
    select: { title: true, description: true },
  });

  if (latestNews.length === 0) {
    return '・今日の主要ニュースはまだ取得中です。';
  }

  const headlines = latestNews.map((n, i) => `${i + 1}. ${n.title}`).join('\n');

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 300,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content:
            'あなたは経営者向けの朝のニュース要約アシスタントです。以下のニュース見出しから最も重要な2〜3本を選び、それぞれ1行で「・」で始まる箇条書きにまとめてください。日本語で、簡潔に。',
        },
        { role: 'user', content: headlines },
      ],
    });
    return (
      completion.choices[0]?.message?.content?.trim() ||
      latestNews.slice(0, 3).map((n) => `・${n.title}`).join('\n')
    );
  } catch (err) {
    console.error('[Morning LINE] GPT business summary failed:', err);
    return latestNews.slice(0, 3).map((n) => `・${n.title}`).join('\n');
  }
}

// ── VitaAI: wellness morning tip ──

async function buildWellnessTip(): Promise<string> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 200,
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content:
            'あなたはVitaAIウェルネスアシスタントです。毎朝ユーザーに送る短い健康アドバイスを1つ生成してください。睡眠、栄養、運動、ストレス管理、水分補給などのテーマからランダムに選び、実行しやすい具体的なアドバイスを日本語で2〜3文で書いてください。絵文字を1つだけ使ってOK。',
        },
        { role: 'user', content: '今日の朝の健康アドバイスをください。' },
      ],
    });
    return completion.choices[0]?.message?.content?.trim() || '・今日も水分をしっかり摂って、いい一日にしましょう。';
  } catch (err) {
    console.error('[Morning LINE] GPT wellness tip failed:', err);
    return '・深呼吸を3回して、リラックスした状態で1日をスタートしましょう。';
  }
}

// ── Push per user with mode-specific content ──

export async function runMorningLinePush(): Promise<void> {
  try {
    const lineUsers = await prisma.lineUser.findMany({
      where: { morningPushEnabled: true },
      include: { appUser: true },
    });

    if (lineUsers.length === 0) {
      console.log('[Morning LINE] No opted-in users.');
      return;
    }

    // Pre-build snippets (shared across users of same mode)
    const hasExecuWell = lineUsers.some((u) => u.userMode === 'EXECUWELL');
    const hasVitaAI = lineUsers.some((u) => u.userMode === 'VITAAI');

    const [businessSnippet, wellnessTip] = await Promise.all([
      hasExecuWell ? buildBusinessSnippet() : Promise.resolve(''),
      hasVitaAI ? buildWellnessTip() : Promise.resolve(''),
    ]);

    let sent = 0;
    for (const lu of lineUsers) {
      try {
        const name = lu.appUser?.name || lu.displayName || 'ユーザー';

        let text: string;
        if (lu.userMode === 'VITAAI') {
          text =
            `おはようございます、${name}さん。\n\n` +
            `【今日のウェルネスアドバイス】\n${wellnessTip}\n\n` +
            `今日も健康的な1日を過ごしましょう。VitaAIがサポートします。`;
        } else {
          text =
            `おはようございます、${name}さん。\n\n` +
            `今日はこれだけチェックしておくといいかも：\n${businessSnippet}\n\n` +
            `引き続き、目標に集中できる1日になりますように。`;
        }

        await pushText(lu.lineUserId, text);
        sent++;
      } catch (err) {
        console.error(`[LINE] Failed to push to ${lu.lineUserId}:`, err);
      }
    }

    console.log(`[Morning LINE] Pushed morning message to ${sent} users.`);
  } catch (err) {
    console.error('[Morning LINE] Push failed:', err);
  }
}
