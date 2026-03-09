import cron from 'node-cron';
import { getCommonNews, getUserInterestNews } from './newsService.js';
import { analyzeBusinessItemsJA, buildEmailContentJA } from './analysisService.js';
import { sendDailyDigest } from './emailService.js';
import { prisma } from '../prisma.js';
import type { NewsCategory } from '../utils/news-categories.js';
import { runMorningLinePush } from './morningLineService.js';

async function getAllMembersWithInterests(): Promise<Array<{ email: string; interests: NewsCategory[] }>> {
  const users = await prisma.appUser.findMany({
    where: { email: { not: null } },
    select: { 
      email: true,
      industries: true,
    },
  });
  return users
    .filter((u: any) => u.email)
    .map((u: any) => ({
      email: u.email!,
      interests: (u.industries || []) as NewsCategory[],
    }));
}

export function startDailyNewsJob() {
  // Run daily at 07:00 Asia/Tokyo
  cron.schedule('45 2 * * *', async () => {
    try {
      // Step 1: Fetch common news (10 items: 4 JP + 2 global + 2 crypto + 2 market)
      const commonNews = await getCommonNews();
      
      console.log(`[Scheduler] Common news: ${commonNews.length}`);
      // Step 2: Save common news to database
      const newsDate = new Date(); // Today's date when news was collected
      if (commonNews.length > 0) {
        await prisma.newsItem.createMany({
          data: commonNews.map(item => ({
            category: item.category,
            title: item.title,
            description: item.description,
            link: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate) : null,
            source: item.source,
            sourceIcon: item.sourceIcon ?? null,
            country: null,
            industries: (item.industries || []) as any,
            newsDate: newsDate,
          })),
          skipDuplicates: true, // Skip if the same news item already exists
        });
        console.log(`[Scheduler] Saved ${commonNews.length} common news items to database`);
      }

      // Step 3: Analyze common news with AI
      const commonAnalysis = await analyzeBusinessItemsJA(commonNews);
      
      // Step 4: Update news items in database with industry tags
      if (commonNews.length > 0 && commonAnalysis.articles.length > 0) {
        for (const analysisArticle of commonAnalysis.articles) {
          if (analysisArticle.industries && analysisArticle.industries.length > 0) {
            await prisma.newsItem.updateMany({
              where: {
                title: analysisArticle.title,
                link: analysisArticle.link,
              },
              data: {
                industries: analysisArticle.industries as any,
              },
            });
          }
        }
        console.log(`[Scheduler] Updated industry tags for common news items`);
      }

      // Step 5: Get all members with their category preferences
      const members = await getAllMembersWithInterests();
      
      // Step 6: For each user, fetch their interest news (2 per category) and send personalized email
      const jst = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
      
      for (const member of members) {
        try {
          // Fetch user-specific interest news (2 per category)
          const userInterestNews = await getUserInterestNews(member.interests);
          
          // Save user interest news to database
          if (userInterestNews.length > 0) {
            await prisma.newsItem.createMany({
              data: userInterestNews.map(item => ({
                category: item.category,
                title: item.title,
                description: item.description,
                link: item.link,
                pubDate: item.pubDate ? new Date(item.pubDate) : null,
                source: item.source,
                sourceIcon: item.sourceIcon ?? null,
                country: item.country ?? null,
                industries: (item.industries || []) as any,
                newsDate: newsDate,
              })),
              skipDuplicates: true,
            });
            console.log(`[Scheduler] Saved ${userInterestNews.length} interest news items for ${member.email}`);
          }

          // Analyze ONLY user interest news with AI (common news already analyzed)
          let userInterestAnalysis: { articles: any[]; todoList: any[] } = { articles: [], todoList: [] };
          if (userInterestNews.length > 0) {
            userInterestAnalysis = await analyzeBusinessItemsJA(userInterestNews);
            console.log(`[Scheduler] Analyzed ${userInterestNews.length} interest news items for ${member.email}`);
          }

          // Combine common analysis (already done) with user interest analysis
          const combinedAnalysis = {
            articles: [...commonAnalysis.articles, ...userInterestAnalysis.articles],
            todoList: [...commonAnalysis.todoList, ...userInterestAnalysis.todoList],
          };

          // Combine common news + user interest news for email content
          const allUserNews = [...commonNews, ...userInterestNews];
          
          // Build and send email
          const { subject, text, html } = buildEmailContentJA(jst, allUserNews, combinedAnalysis, member.interests);
          await sendDailyDigest([member.email], subject, html, text);
          console.log(`[Scheduler] Sent personalized digest to ${member.email} (${allUserNews.length} items: ${commonNews.length} common + ${userInterestNews.length} interest, categories: ${member.interests.join(', ') || 'none'})`);
        } catch (e) {
          console.error(`[Scheduler] Failed to send digest to ${member.email}:`, e);
        }
      }
      
      // console.log(`[Scheduler] Sent daily digest to ${members.length} recipients`);

      // ── Morning LINE push (after news is ready) ──
      try {
        await runMorningLinePush();
      } catch (lineErr) {
        console.error('[Scheduler] Morning LINE push failed:', lineErr);
      }
    } catch (e) {
      console.error('[Scheduler] Failed to send daily digest:', e);
    }
  }, { timezone: 'Asia/Tokyo' });
}


