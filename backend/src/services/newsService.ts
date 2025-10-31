import Parser from "rss-parser";

export type NewsItem = {
	category: "HEALTH" | "BUSINESS";
	title: string;
	link: string;
	pubDate?: string; // ISO8601 if available
	source: string; // e.g., NHK
};

type RssItem = {
	 title?: string;
	 link?: string;
	 pubDate?: string;
	 [key: string]: any;
};

const parser: any = new Parser({
	customFields: {
		item: ["pubDate", "link", "title"]
	}
});

// Default Japanese official feeds (NHK categories)
// HEALTH: 科学・医療, BUSINESS: 経済
const DEFAULT_FEEDS = {
	HEALTH: [
		process.env.NEWS_FEED_HEALTH || "https://www3.nhk.or.jp/rss/news/cat5.xml",
	],
	BUSINESS: [
		process.env.NEWS_FEED_BUSINESS || "https://www3.nhk.or.jp/rss/news/cat2.xml",
	]
};

async function fetchFromFeed(url: string, category: NewsItem["category"], sourceLabel: string): Promise<NewsItem[]> {
	try {
		const feed = await parser.parseURL(url);
		return (feed.items || []).map((it: RssItem) => ({
			category,
			title: it.title || "",
			link: it.link || (it as any).links?.[0]?.url || "",
			pubDate: it.pubDate ? new Date(it.pubDate).toISOString() : undefined,
			source: sourceLabel
		}));
	} catch (e) {
		console.error(`RSS fetch failed for ${url}:`, e);
		return [];
	}
}

function sortByDateDesc(items: NewsItem[]): NewsItem[] {
	return items.sort((a, b) => {
		const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
		const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
		return tb - ta;
	});
}

export async function getDailyJapaneseNews(): Promise<NewsItem[]> {
	// Fetch from HEALTH feeds
	const healthPromises = DEFAULT_FEEDS.HEALTH.map((u) => fetchFromFeed(u, "HEALTH", "NHK"));
	// Fetch from BUSINESS feeds
	const businessPromises = DEFAULT_FEEDS.BUSINESS.map((u) => fetchFromFeed(u, "BUSINESS", "NHK"));

	const [healthResults, businessResults] = await Promise.all([
		Promise.all(healthPromises),
		Promise.all(businessPromises)
	]);

	const healthItems = sortByDateDesc(healthResults.flat());
	const businessItems = sortByDateDesc(businessResults.flat());

	const selectedHealth = healthItems.slice(0, 1);
	const selectedBusiness = businessItems.slice(0, 4);

	const combined = [...selectedHealth, ...selectedBusiness];
	return sortByDateDesc(combined);
}

export async function logDailyNewsPreview(): Promise<void> {
	const items = await getDailyJapaneseNews();
	console.log("================ Daily News Preview (JA) ================");
	for (const item of items) {
		const when = item.pubDate ? new Date(item.pubDate).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "";
		console.log(`[${item.category}] ${item.title}`);
		console.log(`  ${item.link}`);
		if (when) console.log(`  配信: ${when} (${item.source})`);
	}
	console.log("=========================================================");
}


