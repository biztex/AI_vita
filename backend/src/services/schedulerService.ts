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
  return users.map((u: any) => u.email!).filter(Boolean);
}

export function startDailyNewsJob() {
  // Run daily at 07:00 Asia/Tokyo
  cron.schedule('0 17 * * *', async () => {
    try {
      const items = await getDailyJapaneseNews();
      
      // Save news to database before sending emails
      const newsDate = new Date(); // Today's date when news was collected
      if (items.length > 0) {
        await prisma.newsItem.createMany({
          data: items.map(item => ({
            category: item.category,
            title: item.title,
            description: item.description,
            link: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate) : null,
            source: item.source,
            newsDate: newsDate,
          })),
          skipDuplicates: true, // Skip if the same news item already exists
        });
        console.log(`[Scheduler] Saved ${items.length} news items to database`);
      }

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


