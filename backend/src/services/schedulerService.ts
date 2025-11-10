import cron from 'node-cron';
import { getDailyJapaneseNews } from './newsService.js';
import { analyzeBusinessItemsJA, buildEmailContentJA } from './analysisService.js';
import { sendDailyDigest } from './emailService.js';
import { prisma } from '../prisma.js';

async function getAllMembersWithIndustries(): Promise<Array<{ email: string; industries: string[] }>> {
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
      industries: u.industries || [],
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
      const members = await getAllMembersWithIndustries();
      
      // Send personalized emails to each user based on their industry interests
      const jst = new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
      
      for (const member of members) {
        try {
          // Filter news items based on user's industry interests
          let filteredItems = items;
          let filteredAnalysis = analysis;
          
          if (member.industries.length > 0) {
            // Match items with user's industries
            const industrySet = new Set(member.industries.map(ind => ind.toUpperCase()));
            
            // Create a map of articles by title/link for matching
            const articleMap = new Map<string, typeof analysis.articles[0]>();
            analysis.articles.forEach(article => {
              const key = `${article.title}|${article.link}`;
              articleMap.set(key, article);
            });
            
            // Filter items and analysis articles based on industry match
            const matchingItems: typeof items = [];
            const matchingArticles: typeof analysis.articles = [];
            
            items.forEach(item => {
              const key = `${item.title}|${item.link}`;
              const article = articleMap.get(key);
              
              if (article && article.industries && article.industries.length > 0) {
                // Check if any of the article's industries match user's industries
                const hasMatchingIndustry = article.industries.some(ind => 
                  industrySet.has(ind.toUpperCase())
                );
                
                if (hasMatchingIndustry) {
                  matchingItems.push(item);
                  matchingArticles.push(article);
                }
              } else {
                // If article has no industries or doesn't exist in analysis, 
                // check if item itself has industries
                if (item.industries && item.industries.length > 0) {
                  const hasMatchingIndustry = item.industries.some(ind => 
                    industrySet.has(ind.toUpperCase())
                  );
                  if (hasMatchingIndustry) {
                    matchingItems.push(item);
                    // Create a basic article entry for this item
                    if (article) {
                      matchingArticles.push(article);
                    }
                  }
                }
              }
            });
            
            if (matchingItems.length > 0) {
              filteredItems = matchingItems;
              filteredAnalysis = {
                ...analysis,
                articles: matchingArticles,
              };
            }
          }
          
          // If no matching items, send all items (fallback)
          if (filteredItems.length === 0) {
            filteredItems = items;
            filteredAnalysis = analysis;
          }
          
          const { subject, text, html } = buildEmailContentJA(jst, filteredItems, filteredAnalysis, member.industries);
          await sendDailyDigest([member.email], subject, html, text);
          console.log(`[Scheduler] Sent personalized digest to ${member.email} (${filteredItems.length} items, industries: ${member.industries.join(', ') || 'all'})`);
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


