/**
 * AXEL quality verification harness.
 *
 *   cd backend && npx tsx scripts/verify-axel-quality.ts
 *
 * Exercises the REAL AXEL engine across every capability the client cares
 * about and prints each actual reply so a human can judge quality, plus a few
 * automatic checks. Uses temporary stores under /tmp — it does NOT touch
 * production data. It DOES make live OpenAI calls (text + web search + image +
 * speech-to-text), so it costs a small amount of API usage each run.
 *
 * What it checks:
 *   1. 情報の質問  — intent-first, freshness-honest
 *   2. 判断の相談  — deep structured proposal, personalized to the profile
 *   3. Web検索     — current info, official-source (go.jp) citations
 *   4. 画像解析    — reads a sample ad and ties it to the user
 *   5. 音声解析    — transcribes a sample voice clip and answers it
 */
import * as fs from 'fs';
import * as path from 'path';

const TMP = '/tmp/axel_verify_' + process.pid;
process.env.AXEL_STATE_FILE = TMP + '_state.json';
process.env.AXEL_MEMORY_FILE = TMP + '_memory.json';
process.env.AXEL_JOURNAL_FILE = TMP + '_journal.json';

// Run from the backend/ directory: `cd backend && npx tsx scripts/verify-axel-quality.ts`
const FIX = path.join(process.cwd(), 'scripts', 'fixtures');
const bar = '─'.repeat(64);

function show(title: string, reply: string, checks: [string, boolean][]) {
  console.log('\n' + bar);
  console.log('■ ' + title);
  console.log(bar);
  console.log(reply.trim());
  console.log('');
  for (const [label, ok] of checks) console.log(`   ${ok ? '✓' : '✗'} ${label}`);
}

async function main() {
  const { respondAsAxel } = await import('../src/services/axelEngine');
  const { transcribeAudio } = await import('../src/services/axelVoice');
  const { setConversationState } = await import('../src/services/lineConversationStore');

  console.log('\n════════ AXEL 品質検証 ════════');
  console.log('（実際のAIエンジンを呼び出しています。数分かかります）');

  // Seed a representative user so personalization can be observed
  const U = 'verify-user';
  setConversationState(U, {
    phase: 'IDLE',
    onboarding: {
      name: '佐藤',
      currentBusiness: 'BtoB SaaS事業を経営（従業員8名）',
      futureGoals: '2年でARRを3倍にする',
      thinkingStyle: '戦略型',
      completedAt: new Date().toISOString(),
    } as any,
    trustContractSentAt: new Date().toISOString(),
  } as any);

  // 1. Information question (freshness honesty) — web search off
  process.env.AXEL_WEB_SEARCH = 'off';
  const r1 = await respondAsAxel({ kind: 'text', lineUserId: 'verify-info', text: '確定申告っていつまでですか？' });
  show('1. 情報の質問（鮮度の正直さ）  Q:「確定申告っていつまでですか？」', r1, [
    ['まず質問の意図を受け止めている', !/^(申し訳|できません|確認できません)/.test(r1.trim())],
    ['最新情報の限界を正直に伝えている', /確認|公式|国税庁|最新/.test(r1)],
    ['エラー応答ではない', !r1.includes('問題が発生')],
  ]);

  // 2. Judgment consultation (deep + personalized) — web search off
  const r2 = await respondAsAxel({ kind: 'text', lineUserId: U, text: '幹部を1人採用すべきか、資金を製品開発に回すべきか迷っています。' });
  show('2. 判断の相談（深掘り・個別化）  Q:「幹部採用か製品開発か迷っています」', r2, [
    ['構造的な深掘り提案（論点・選択肢・見立て等）', /論点|選択肢|見立て|メリット|デメリット/.test(r2)],
    ['利用者情報を反映（佐藤/SaaS/ARR/8名）', /佐藤|SaaS|ARR|8名|従業員/.test(r2)],
    ['性格タイプの記号を口にしていない（INTJ等）', !/INTJ|ISTJ|ESTJ|ENFP/.test(r2)],
    ['十分な内容量', r2.length > 300],
  ]);

  // 3. Web search (current info + official sources) — web search on
  process.env.AXEL_WEB_SEARCH = 'on';
  const r3 = await respondAsAxel({ kind: 'text', lineUserId: 'verify-search', text: '今年の小規模事業者持続化補助金は申請できますか？公式の申込先も教えて' });
  const urls3 = r3.match(/https?:\/\/[^\s　）)」】、,]+/g) || [];
  const official3 = urls3.filter((u) => /\.go\.jp|\.lg\.jp/.test(u));
  show('3. Web検索（公式優先・出典表示）  Q:「持続化補助金は申請できる？公式の申込先も」', r3, [
    [`出典URLを表示（${urls3.length}件）`, urls3.length > 0],
    [`公式ドメイン(go.jp/lg.jp)を含む（${official3.length}件）`, official3.length > 0],
    ['非公式サイトを「公式」と誤表示していない', !/\.(info|com)[^\s]{0,40}\n?[^\n]{0,10}公式/.test(r3)],
    ['追跡パラメータ(utm)が漏れていない', !/utm_source/.test(r3)],
  ]);

  // 4. Image analysis — web search off
  process.env.AXEL_WEB_SEARCH = 'off';
  const adUri = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(FIX, 'sample-ad.jpg')).toString('base64');
  const r4 = await respondAsAxel({ kind: 'image', lineUserId: U, imageDataUri: adUri });
  show('4. 画像解析  （ホームページ制作サブスク広告の画像を送信）', r4, [
    ['画像の内容を読み取っている（9,800円/6ヶ月等）', /9,?800|6[ヶか]月|サブスク|ホームページ/.test(r4)],
    ['利用者の事業に結びつけている（SaaS/佐藤）', /佐藤|SaaS|事業/.test(r4)],
    ['エラー応答ではない', !r4.includes('問題が発生')],
  ]);

  // 5. Voice analysis — web search off
  const audio = fs.readFileSync(path.join(FIX, 'sample-voice.mp3'));
  const transcript = await transcribeAudio(audio, 'sample.mp3');
  const r5 = transcript ? await respondAsAxel({ kind: 'text', lineUserId: 'verify-voice', text: transcript }) : '(文字起こし失敗)';
  show('5. 音声解析  （相談の音声を送信）', `【文字起こし】${transcript}\n\n【AXELの返答】\n${r5}`, [
    ['音声を日本語で正しく認識', !!transcript && /[぀-ヿ一-鿿]/.test(transcript)],
    ['認識内容に沿って相談として応答', !!transcript && r5.length > 30 && !r5.includes('問題が発生')],
  ]);

  console.log('\n' + bar);
  console.log('検証完了。各セクションの返答内容をご確認ください。');
  console.log(bar + '\n');

  // Cleanup temp stores
  for (const f of [process.env.AXEL_STATE_FILE, process.env.AXEL_MEMORY_FILE, process.env.AXEL_JOURNAL_FILE]) {
    try { if (f) fs.unlinkSync(f); } catch { /* ignore */ }
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
