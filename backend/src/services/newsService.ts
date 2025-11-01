import Parser from "rss-parser";

export type NewsItem = {
	category: "HEALTH" | "BUSINESS";
	title: string;
	description: string;
	link: string;
	pubDate?: string; // ISO8601 if available
	source: string; // e.g., NHK, CNBC
};

type RssItem = {
	 title?: string;
	 link?: string;
	 pubDate?: string;
	 [key: string]: any;
};

const parser: any = new Parser({
	customFields: {
		item: ["pubDate", "link", "title", "description", "contentSnippet", "content", "summary", "content:encoded"]
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

const CNBC_FEED = process.env.NEWS_FEED_CNBC || "https://www.cnbc.com/id/100003114/device/rss/rss.html";

function extractDescription(it: RssItem): string {
	const raw = (it as any)["content:encoded"] || it.contentSnippet || it.summary || it.description || it.content || "";
	if (!raw) return "";
	// Strip HTML if present
	const text = String(raw).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
	return text;
}

async function fetchFromFeed(url: string, category: NewsItem["category"], sourceLabel: string): Promise<NewsItem[]> {
	try {
		const feed = await parser.parseURL(url);
		return (feed.items || []).map((it: RssItem) => ({
			category,
			title: it.title || "",
			description: extractDescription(it),
			link: it.link || (it as any).links?.[0]?.url || "",
			pubDate: it.pubDate ? new Date(it.pubDate).toISOString() : undefined,
			source: sourceLabel
		}))
		.filter((n: NewsItem) => n.title.trim().length > 0 && n.description.trim().length > 0);
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

function isBusinessRelated(item: NewsItem): boolean {
	const hay = `${item.title} ${item.description}`.toLowerCase();
	const keywords = [
		"business","management","finance","financial","corporate","corporation","company","companies",
		"earnings","market","markets","stock","stocks","equity","equities","bond","bonds","economy","economic",
		"merger","acquisition","m&a","ipo","revenue","profit","guidance","shares","ceo","cfo","industry","regulation"
	];
	return keywords.some(k => hay.includes(k));
}

async function fetchCnbcTop(count: number): Promise<NewsItem[]> {
	const items = await fetchFromFeed(CNBC_FEED, "BUSINESS", "CNBC");
	const filtered = items.filter(isBusinessRelated);
	return sortByDateDesc(filtered).slice(0, count);
}

export async function getDailyJapaneseNews(): Promise<NewsItem[]> {
	// Fetch BUSINESS (NHK) and CNBC only. Health is excluded.
	const businessPromises = DEFAULT_FEEDS.BUSINESS.map((u) => fetchFromFeed(u, "BUSINESS", "NHK"));

	const [businessResults, cnbcTop] = await Promise.all([
		Promise.all(businessPromises),
		fetchCnbcTop(3)
	]);

	const nhkBusinessItems = sortByDateDesc(businessResults.flat());

	const selectedCnbc = cnbcTop; // already sliced(3)
	const remainingBusinessSlots = Math.max(0, 5 - selectedCnbc.length);
	const selectedNhkBusiness = nhkBusinessItems.slice(0, remainingBusinessSlots);

	const combined = [...selectedCnbc, ...selectedNhkBusiness];
	return sortByDateDesc(combined);
}

export async function logDailyNewsPreview(): Promise<void> {
	const items = await getDailyJapaneseNews();
	console.log("================ Daily News Preview (JA) ================");
	for (const item of items) {
		const when = item.pubDate ? new Date(item.pubDate).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "";
		console.log(`[${item.category}] ${item.title}`);
		console.log(`  ${item.description}`);
		console.log(`  ${item.link}`);
		if (when) console.log(`  配信: ${when} (${item.source})`);
	}
	console.log("=========================================================");
}


