type NewsItem = {
  title: string;
  link: string;
  publishedAt?: Date;
  source: string;
  category: "HEALTH" | "BUSINESS" | "DOMESTIC" | "INTERNATIONAL";
};

function parseRssItems(xml: string): Array<{
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
}> {
  const items: Array<{ title?: string; link?: string; pubDate?: string; description?: string }> = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  const matches = xml.match(itemRegex) || [];
  for (const itemXml of matches) {
    const getTag = (tag: string) => {
      const m = itemXml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
      return m ? m[1].replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1").trim() : undefined;
    };
    items.push({
      title: getTag("title"),
      link: getTag("link"),
      pubDate: getTag("pubDate") || getTag("published"),
      description: getTag("description") || getTag("summary"),
    });
  }
  return items;
}

async function fetchRss(url: string, source: string): Promise<NewsItem[]> {
  const res = await fetch(url, { headers: { "User-Agent": "ExecuNewsBot/1.0" } });
  if (!res.ok) throw new Error(`Failed to fetch RSS: ${source} (${res.status})`);
  const xml = await res.text();
  const items = parseRssItems(xml);
  return items.map((i) => ({
    title: i.title || "Untitled",
    link: i.link || url,
    publishedAt: i.pubDate ? new Date(i.pubDate) : undefined,
    source,
    // category will be assigned by caller based on source group
    category: "BUSINESS",
  }));
}

const SOURCES = {
  HEALTH: [
    { url: "https://www.who.int/feeds/entity/mediacentre/news/en/rss.xml", source: "WHO" },
  ],
  BUSINESS: [
    { url: "https://feeds.reuters.com/reuters/businessNews", source: "Reuters Business" },
    { url: "https://www.cnbc.com/id/10001147/device/rss/rss.html", source: "CNBC Business" },
    { url: "https://www.bloomberg.com/feed/podcast/etf-report.xml", source: "Bloomberg" },
  ],
  DOMESTIC: [
    { url: "https://feeds.bbci.co.uk/news/uk/rss.xml", source: "BBC UK" },
  ],
  INTERNATIONAL: [
    { url: "https://feeds.bbci.co.uk/news/world/rss.xml", source: "BBC World" },
    { url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", source: "NYTimes World" },
  ],
} as const;

function takeTop(items: NewsItem[], count: number): NewsItem[] {
  return items
    .sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0))
    .slice(0, count);
}

export async function getDailyNews() {
  // Fetch health and business categories
  const [healthLists, businessLists] = await Promise.all([
    Promise.all(SOURCES.HEALTH.map(s => fetchRss(s.url, s.source))),
    Promise.all(SOURCES.BUSINESS.map(s => fetchRss(s.url, s.source))),
  ]);

  // 1 health item
  const health = takeTop(
    healthLists.flat().map(i => ({ ...i, category: "HEALTH" as const })),
    1
  );

  // For demonstration, just take first 2 as global, next 2 as domestic
  // (In real usage, you may distinguish global/domestic by source/news content)
  const allBiz = businessLists.flat().sort((a, b) => (b.publishedAt?.getTime() || 0) - (a.publishedAt?.getTime() || 0));
  const businessGlobal = allBiz.slice(0, 2).map(i => ({ ...i, category: "INTERNATIONAL" as const }));
  const businessDomestic = allBiz.slice(2, 4).map(i => ({ ...i, category: "DOMESTIC" as const }));

  return { health, businessGlobal, businessDomestic };
}

export function logNewsToConsole(news: Awaited<ReturnType<typeof getDailyNews>>) {
  const sections: Array<[string, NewsItem[]]> = [
    ["HEALTH", news.health],
    ["BUSINESS - INTERNATIONAL", news.businessGlobal],
    ["BUSINESS - DOMESTIC", news.businessDomestic],
  ];
  console.log("=== Daily News Selection ===");
  for (const [section, items] of sections) {
    console.log(`\n[${section}]`);
    for (const item of items) {
      console.log(`- ${item.title} (${item.source})`);
      console.log(`  ${item.link}`);
      if (item.publishedAt) {
        console.log(`  ${item.publishedAt.toISOString()}`);
      }
    }
  }
}


