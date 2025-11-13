import cron from 'node-cron';
import { getDailyJapaneseNews } from './newsService.js';
import { analyzeBusinessItemsJA, buildEmailContentJA } from './analysisService.js';
import { sendDailyDigest } from './emailService.js';
import { prisma } from '../prisma.js';
import type { NewsCategory } from '../../../shared/news-categories.js';

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
  cron.schedule('0 7 * * *', async () => {
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
            industries: (item.industries || []) as any,
            newsDate: newsDate,
          })),
          skipDuplicates: true, // Skip if the same news item already exists
        });
        console.log(`[Scheduler] Saved ${items.length} news items to database`);
      }

      const analysis = await analyzeBusinessItemsJA(items);
      
      // Update news items in database with industry tags
      if (items.length > 0 && analysis.articles.length > 0) {
        for (const analysisArticle of analysis.articles) {
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
        console.log(`[Scheduler] Updated industry tags for news items`);
      }

      // Get all members with their industry preferences
      const members = await getAllMembersWithInterests();
      
      // Send personalized emails to each user based on their industry interests
      const jst = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
      
      for (const member of members) {
        try {
          // Filter news items based on user's preferred categories
          let filteredItems = items;
          let filteredAnalysis = analysis;
          
          if (member.interests.length > 0) {
            const interestSet = new Set(member.interests);

            const matchingItems = items.filter(item =>
              item.categories.some(category => interestSet.has(category))
            );

            const matchingArticles = analysis.articles.filter(article =>
              (article.categories && article.categories.some(category => interestSet.has(category))) ||
              interestSet.has(article.category)
            );

            if (matchingItems.length > 0) {
              filteredItems = matchingItems;
              filteredAnalysis = {
                ...analysis,
                articles: matchingArticles.length > 0 ? matchingArticles : matchingItems.map(item => {
                  const key = `${item.title}|${item.link}`;
                  const existing = analysis.articles.find(article => `${article.title}|${article.link}` === key);
                  return existing ?? {
                    title: item.title,
                    description: item.description,
                    link: item.link,
                    source: item.source,
                    category: item.category,
                    categories: item.categories,
                    origin: item.origin,
                    insights: {
                      keyPoints: ['分析中...'],
                      actionProposal: '分析中...',
                      importance: '分析中...',
                      risk: '分析中...',
                    },
                    industries: item.industries ?? [],
                  };
                }),
              };
            }
          }
          
          // If no matching items, send all items (fallback)
          if (filteredItems.length === 0) {
            filteredItems = items;
            filteredAnalysis = analysis;
          }
          
          const { subject, text, html } = buildEmailContentJA(jst, filteredItems, filteredAnalysis, member.interests);
          await sendDailyDigest([member.email], subject, html, text);
          console.log(`[Scheduler] Sent personalized digest to ${member.email} (${filteredItems.length} items, categories: ${member.interests.join(', ') || 'all'})`);
        } catch (e) {
          console.error(`[Scheduler] Failed to send digest to ${member.email}:`, e);
        }
      }
      
      console.log(`[Scheduler] Sent daily digest to ${members.length} recipients`);
    } catch (e) {
      console.error('[Scheduler] Failed to send daily digest:', e);
    }
  }, { timezone: 'Asia/Tokyo' });
}


