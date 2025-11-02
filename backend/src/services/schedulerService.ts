import cron from 'node-cron';
import { getDailyJapaneseNews } from './newsService.js';
import { analyzeBusinessItemsJA, buildEmailContentJA } from './analysisService.js';
import { sendDailyDigest } from './emailService.js';
import { prisma } from '../prisma.js';

async function getAllMemberEmails(): Promise<string[]> {
  const users = await prisma.appUser.findMany({
    where: { email: { not: null } },
    select: { email: true },
  });
  return users.map((u) => u.email!).filter(Boolean);
}

export function startDailyNewsJob() {
  // Run daily at 07:00 Asia/Tokyo
  cron.schedule('0 0 * * *', async () => {
    try {
      const items = await getDailyJapaneseNews();
      const analysis = await analyzeBusinessItemsJA(items);
      const jst = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
      const { subject, text, html } = buildEmailContentJA(jst, items, analysis);

      const recipients = await getAllMemberEmails();
      await sendDailyDigest(recipients, subject, html, text);
      console.log(`[Scheduler] Sent daily digest to ${recipients.length} recipients`);
    } catch (e) {
      console.error('[Scheduler] Failed to send daily digest:', e);
    }
  }, { timezone: 'Asia/Tokyo' });
}


