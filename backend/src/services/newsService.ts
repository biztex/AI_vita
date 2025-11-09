import Parser from "rss-parser";

export type NewsItem = {
	category: "HEALTH" | "BUSINESS";
	title: string;
	description: string;
	link: string;
	pubDate?: string; // ISO8601 if available
	source: string; // e.g., NHK, CNBC
	topic?: NewsTopic; // Topic classification
	relevanceScore?: number; // Relevance score for ranking
};

export type NewsTopic = 
	| "CURRENCY" // Currency exchange rates, JPY
	| "COMPANY" // Company news (bankruptcies, rises, earnings)
	| "FINANCE" // Finance, banking, financial markets
	| "ECONOMY" // Economy, economic policy
	| "TRADE" // Trade, exports, imports
	| "REGULATION" // Regulations, policies
	| "MARKET" // Stock market, markets
	| "GENERAL"; // General business news

type RssItem = {
	title?: string;
	link?: string;
	pubDate?: string;
	[key: string]: any;
};

type FeedConfig = {
	url: string;
	source: string;
	category: NewsItem["category"];
	priority: number; // Higher priority = more important (1-10)
	topics: NewsTopic[]; // Expected topics from this feed
};

const parser: any = new Parser({
	customFields: {
		item: ["pubDate", "link", "title", "description", "contentSnippet", "content", "summary", "content:encoded"]
	}
});

// Comprehensive official RSS feeds categorized by source and topic
// Priority: 10 = highest (official government/central bank), 5 = medium (major news), 1 = lower
// Note: Some feeds may require verification of actual RSS URLs - system will gracefully handle failures
const FEED_CONFIGS: FeedConfig[] = [
	// Japanese Official Sources (Highest Priority)
	{
		url: process.env.NEWS_FEED_NHK_BUSINESS || "https://www3.nhk.or.jp/rss/news/cat2.xml",
		source: "NHK",
		category: "BUSINESS",
		priority: 9,
		topics: ["ECONOMY", "FINANCE", "COMPANY", "CURRENCY", "GENERAL"]
	},
	
	// Japanese News Sources (Verified Working Feeds)
	{
		url: process.env.NEWS_FEED_NIKKEI_BUSINESS || "https://www.nikkei.com/rss/",
		source: "日本経済新聞 (Nikkei)",
		category: "BUSINESS",
		priority: 8,
		topics: ["ECONOMY", "FINANCE", "COMPANY", "MARKET", "CURRENCY"]
	},
	{
		url: process.env.NEWS_FEED_NIKKEI_ASIA || "https://asia.nikkei.com/rss",
		source: "Nikkei Asia",
		category: "BUSINESS",
		priority: 7,
		topics: ["ECONOMY", "TRADE", "COMPANY", "GENERAL"]
	},
	
	// International News Sources (Verified Working Feeds)
	{
		url: process.env.NEWS_FEED_CNBC || "https://www.cnbc.com/id/100003114/device/rss/rss.html",
		source: "CNBC",
		category: "BUSINESS",
		priority: 6,
		topics: ["MARKET", "FINANCE", "ECONOMY", "COMPANY"]
	},
	{
		url: process.env.NEWS_FEED_REUTERS_BUSINESS || "https://feeds.reuters.com/reuters/businessNews",
		source: "Reuters Business",
		category: "BUSINESS",
		priority: 7,
		topics: ["MARKET", "FINANCE", "ECONOMY", "COMPANY", "CURRENCY"]
	},
	{
		url: process.env.NEWS_FEED_REUTERS_FINANCE || "https://feeds.reuters.com/reuters/finance",
		source: "Reuters Finance",
		category: "BUSINESS",
		priority: 7,
		topics: ["FINANCE", "MARKET", "CURRENCY", "ECONOMY"]
	},
	{
		url: process.env.NEWS_FEED_BLOOMBERG || "https://feeds.bloomberg.com/markets/news.rss",
		source: "Bloomberg",
		category: "BUSINESS",
		priority: 7,
		topics: ["MARKET", "FINANCE", "ECONOMY", "COMPANY", "CURRENCY"]
	},
	
	// Official Government Sources (May need URL verification - gracefully handles failures)
	{
		url: process.env.NEWS_FEED_FSA || "https://www.fsa.go.jp/news/rss/news.xml",
		source: "金融庁 (FSA)",
		category: "BUSINESS",
		priority: 10,
		topics: ["FINANCE", "REGULATION", "MARKET"]
	},
	{
		url: process.env.NEWS_FEED_METI || "https://www.meti.go.jp/press/rss.xml",
		source: "経済産業省 (METI)",
		category: "BUSINESS",
		priority: 10,
		topics: ["ECONOMY", "TRADE", "COMPANY", "REGULATION"]
	},
	{
		url: process.env.NEWS_FEED_MOF || "https://www.mof.go.jp/press/rss.xml",
		source: "財務省 (MOF)",
		category: "BUSINESS",
		priority: 10,
		topics: ["FINANCE", "ECONOMY", "CURRENCY", "REGULATION"]
	},
	{
		url: process.env.NEWS_FEED_JPX || "https://www.jpx.co.jp/rss/news.xml",
		source: "日本取引所グループ (JPX)",
		category: "BUSINESS",
		priority: 9,
		topics: ["MARKET", "COMPANY", "FINANCE"]
	},
	// Note: BOJ doesn't provide a standard RSS feed, but their press releases are important
	// Consider using their press release page or removing if not available
	// {
	// 	url: process.env.NEWS_FEED_BOJ || "",
	// 	source: "日本銀行 (BOJ)",
	// 	category: "BUSINESS",
	// 	priority: 10,
	// 	topics: ["CURRENCY", "FINANCE", "ECONOMY"]
	// },
	
	// International Official Sources
	{
		url: process.env.NEWS_FEED_FRB || "https://www.federalreserve.gov/feeds/press_all.xml",
		source: "Federal Reserve (FRB)",
		category: "BUSINESS",
		priority: 9,
		topics: ["FINANCE", "CURRENCY", "ECONOMY"]
	},
	{
		url: process.env.NEWS_FEED_ECB || "https://www.ecb.europa.eu/rss/press.html",
		source: "European Central Bank (ECB)",
		category: "BUSINESS",
		priority: 8,
		topics: ["FINANCE", "CURRENCY", "ECONOMY"]
	},
];

function extractDescription(it: RssItem): string {
	const raw = (it as any)["content:encoded"] || it.contentSnippet || it.summary || it.description || it.content || "";
	if (!raw) return "";
	// Strip HTML if present
	const text = String(raw).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
	return text;
}

async function fetchFromFeed(config: FeedConfig, timeoutMs: number = 10000): Promise<NewsItem[]> {
	try {
		// Create a timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
		});
		
		// Race between fetch and timeout
		const feed = await Promise.race([
			parser.parseURL(config.url),
			timeoutPromise
		]) as any;
		
		if (!feed || !feed.items) {
			console.warn(`[NewsService] Empty feed from ${config.source}`);
			return [];
		}
		
		const items = (feed.items || []).map((it: RssItem) => {
			const title = it.title || "";
			const description = extractDescription(it);
			
			// Skip items without meaningful content
			if (title.trim().length === 0 || description.trim().length < 20) {
				return null;
			}
			
			const topic = classifyTopic(title, description);
			const relevanceScore = calculateRelevanceScore(title, description, topic, config);
			
			return {
				category: config.category,
				title,
				description,
				link: it.link || (it as any).links?.[0]?.url || "",
				pubDate: it.pubDate ? new Date(it.pubDate).toISOString() : undefined,
				source: config.source,
				topic,
				relevanceScore
			};
		})
		.filter((n: NewsItem | null): n is NewsItem => n !== null);
		
		console.log(`[NewsService] Fetched ${items.length} items from ${config.source}`);
		return items;
	} catch (e: any) {
		// Log error but don't fail completely - other feeds may still work
		const errorMsg = e?.message || String(e);
		if (!errorMsg.includes("Timeout")) {
			console.warn(`[NewsService] RSS fetch failed for ${config.source}: ${errorMsg.substring(0, 100)}`);
		}
		return [];
	}
}

function classifyTopic(title: string, description: string): NewsTopic {
	const text = `${title} ${description}`.toLowerCase();
	
	// Currency exchange rates (JPY, yen, USD/JPY, exchange rate)
	if (/\b(jpy|yen|為替|exchange rate|usd\/jpy|eur\/jpy|currency|通貨|レート|円高|円安)\b/i.test(text)) {
		return "CURRENCY";
	}
	
	// Company news (bankruptcy, rise, earnings, IPO, merger)
	if (/\b(倒産|bankruptcy|破綻|上場|ipo|merger|acquisition|earnings|決算|業績|会社|company|企業|corporate)\b/i.test(text)) {
		return "COMPANY";
	}
	
	// Finance (banking, financial, credit, loan)
	if (/\b(finance|financial|bank|banking|credit|loan|金融|銀行|融資|信用)\b/i.test(text)) {
		return "FINANCE";
	}
	
	// Economy (economic, GDP, growth, recession)
	if (/\b(economy|economic|gdp|growth|recession|景気|経済|成長|不況)\b/i.test(text)) {
		return "ECONOMY";
	}
	
	// Trade (trade, export, import, tariff)
	if (/\b(trade|export|import|tariff|貿易|輸出|輸入|関税)\b/i.test(text)) {
		return "TRADE";
	}
	
	// Regulation (regulation, policy, law, rule)
	if (/\b(regulation|policy|law|rule|規制|政策|法律|規則)\b/i.test(text)) {
		return "REGULATION";
	}
	
	// Market (stock market, market, equity, bond)
	if (/\b(market|stock|equity|bond|株式|市場|債券)\b/i.test(text)) {
		return "MARKET";
	}
	
	return "GENERAL";
}

function calculateRelevanceScore(
	title: string,
	description: string,
	topic: NewsTopic,
	config: FeedConfig
): number {
	let score = config.priority; // Start with feed priority
	
	const text = `${title} ${description}`.toLowerCase();
	
	// Boost score for high-priority topics
	if (topic === "CURRENCY") {
		// Strong boost for JPY-specific currency news
		if (/\b(jpy|yen|円|usd\/jpy|eur\/jpy|gbp\/jpy|為替レート|為替相場|円相場)\b/i.test(text)) {
			score += 8; // Very high boost for JPY currency news
		} else if (/\b(為替|exchange rate|currency|通貨|レート)\b/i.test(text)) {
			score += 4; // Moderate boost for general currency news
		}
		score += 3; // Base boost for currency topic
	}
	
	if (topic === "COMPANY") {
		// Strong boost for Japanese company news (bankruptcies, rises, major events)
		if (/\b(倒産|bankruptcy|破綻|経営破綻|会社更生)\b/i.test(text)) {
			score += 7; // High boost for bankruptcies
		}
		if (/\b(上場|ipo|新規上場|上場廃止|上場申請)\b/i.test(text)) {
			score += 6; // High boost for IPO/listing news
		}
		if (/\b(日本|japan|japanese|日本の企業|日本企業)\b/i.test(text)) {
			score += 5; // Boost for Japanese companies
		}
		if (/\b(決算|earnings|業績|収益|利益|売上)\b/i.test(text)) {
			score += 4; // Boost for earnings news
		}
		if (/\b(買収|merger|acquisition|合併|m&a)\b/i.test(text)) {
			score += 3; // Boost for M&A news
		}
		score += 2; // Base boost for company topic
	}
	
	// Boost for finance and economy topics
	if (topic === "FINANCE") {
		if (/\b(銀行|bank|金融機関|financial institution)\b/i.test(text)) {
			score += 3; // Boost for banking news
		}
		score += 2;
	}
	
	if (topic === "ECONOMY") {
		if (/\b(日本|japan|japanese|gdp|景気|経済成長)\b/i.test(text)) {
			score += 3; // Boost for Japanese economy news
		}
		score += 2;
	}
	
	// Boost if topic matches feed's expected topics
	if (config.topics.includes(topic)) {
		score += 1;
	}
	
	// Boost for official government sources (FSA, METI, MOF, etc.)
	if (config.priority >= 10) {
		score += 2;
	}
	
	return score;
}

function sortByDateDesc(items: NewsItem[]): NewsItem[] {
	return items.sort((a, b) => {
		const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
		const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
		return tb - ta;
	});
}

function sortByRelevance(items: NewsItem[]): NewsItem[] {
	return items.sort((a, b) => {
		// First by relevance score (higher is better)
		const scoreDiff = (b.relevanceScore || 0) - (a.relevanceScore || 0);
		if (Math.abs(scoreDiff) > 2) {
			return scoreDiff;
		}
		
		// Then by recency (more recent is better)
		const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
		const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
		return tb - ta;
	});
}

function filterHighQualityNews(items: NewsItem[]): NewsItem[] {
	// Filter and prioritize:
	// 1. Currency exchange rate news (especially JPY)
	// 2. Japanese company news (bankruptcies, rises, major events)
	// 3. Finance and economy news from official sources
	// 4. Recent news (within last 7 days)
	
	const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
	
	return items.filter(item => {
		// Filter out very old news (older than 30 days)
		if (item.pubDate) {
			const pubDate = Date.parse(item.pubDate);
			if (pubDate < Date.now() - (30 * 24 * 60 * 60 * 1000)) {
				return false;
			}
		}
		
		// Keep all items from high-priority sources
		if ((item.relevanceScore || 0) >= 8) {
			return true;
		}
		
		// Keep currency and company news
		if (item.topic === "CURRENCY" || item.topic === "COMPANY") {
			return true;
		}
		
		// Keep recent finance/economy news
		if ((item.topic === "FINANCE" || item.topic === "ECONOMY") && item.pubDate) {
			const pubDate = Date.parse(item.pubDate);
			if (pubDate >= sevenDaysAgo) {
				return true;
			}
		}
		
		// Keep items with high relevance score
		if ((item.relevanceScore || 0) >= 6) {
			return true;
		}
		
		return false;
	});
}

export async function getDailyJapaneseNews(): Promise<NewsItem[]> {
	// Fetch from all feeds in parallel
	const feedPromises = FEED_CONFIGS.map(config => fetchFromFeed(config));
	const allResults = await Promise.all(feedPromises);
	
	// Flatten and combine all news items
	let allItems = allResults.flat();
	
	// Remove duplicates (same title or link)
	const seenTitles = new Set<string>();
	const seenLinks = new Set<string>();
	allItems = allItems.filter(item => {
		const titleKey = item.title.toLowerCase().trim();
		const linkKey = item.link.toLowerCase().trim();
		
		if (seenTitles.has(titleKey) || seenLinks.has(linkKey)) {
			return false;
		}
		
		seenTitles.add(titleKey);
		seenLinks.add(linkKey);
		return true;
	});
	
	// Filter for high-quality, relevant news
	const filteredItems = filterHighQualityNews(allItems);
	
	// Sort by relevance and recency
	const sortedItems = sortByRelevance(filteredItems);
	
	// Select top items with priority on:
	// 1. At least 1 currency exchange rate news (if available)
	// 2. At least 1-2 Japanese company news (if available)
	// 3. Balance of finance/economy news from official sources
	// 4. About 1 international news item
	// Total: approximately 5 items
	
	const selectedItems: NewsItem[] = [];
	const selectedTopics = new Set<NewsTopic>();
	const selectedSources = new Set<string>();
	
	// Priority 1: Currency exchange rate news (especially JPY) - Always include if available
	const currencyNews = sortedItems.filter(item => 
		item.topic === "CURRENCY" &&
		/\b(jpy|yen|円|為替|exchange rate|usd\/jpy|eur\/jpy)\b/i.test(`${item.title} ${item.description}`)
	);
	if (currencyNews.length > 0) {
		// Select the most relevant currency news
		const topCurrency = currencyNews[0];
		selectedItems.push(topCurrency);
		selectedTopics.add(topCurrency.topic!);
		selectedSources.add(topCurrency.source);
		console.log(`[NewsService] Selected currency news: ${topCurrency.title.substring(0, 50)}...`);
	}
	
	// Priority 2: Japanese company news (bankruptcies, IPOs, major events) - Always include if available
	const companyNews = sortedItems.filter(item => 
		item.topic === "COMPANY" && 
		/\b(日本|japan|japanese|倒産|bankruptcy|上場|ipo|新規上場|決算|earnings|買収|merger)\b/i.test(`${item.title} ${item.description}`)
	);
	
	// Prioritize bankruptcies and IPOs
	const bankruptcyNews = companyNews.filter(item => 
		/\b(倒産|bankruptcy|破綻|経営破綻)\b/i.test(`${item.title} ${item.description}`)
	);
	const ipoNews = companyNews.filter(item => 
		/\b(上場|ipo|新規上場)\b/i.test(`${item.title} ${item.description}`)
	);
	
	// Add bankruptcy news first (high impact)
	if (bankruptcyNews.length > 0) {
		const topBankruptcy = bankruptcyNews[0];
		if (!selectedItems.some(item => item.link === topBankruptcy.link)) {
			selectedItems.push(topBankruptcy);
			selectedTopics.add(topBankruptcy.topic!);
			selectedSources.add(topBankruptcy.source);
			console.log(`[NewsService] Selected company news (bankruptcy): ${topBankruptcy.title.substring(0, 50)}...`);
		}
	}
	
	// Add IPO news
	if (ipoNews.length > 0 && selectedItems.length < 5) {
		const topIpo = ipoNews[0];
		if (!selectedItems.some(item => item.link === topIpo.link)) {
			selectedItems.push(topIpo);
			selectedTopics.add(topIpo.topic!);
			selectedSources.add(topIpo.source);
			console.log(`[NewsService] Selected company news (IPO): ${topIpo.title.substring(0, 50)}...`);
		}
	}
	
	// Add other important company news (earnings, M&A)
	if (selectedItems.length < 4) {
		const otherCompanyNews = companyNews.filter(item => 
			!bankruptcyNews.includes(item) && 
			!ipoNews.includes(item) &&
			!selectedItems.some(selected => selected.link === item.link)
		);
		if (otherCompanyNews.length > 0) {
			const topOther = otherCompanyNews[0];
			selectedItems.push(topOther);
			selectedTopics.add(topOther.topic!);
			selectedSources.add(topOther.source);
		}
	}
	
	// Priority 3: High-priority official sources (FSA, METI, MOF, BOJ, JPX)
	const officialNews = sortedItems.filter(item => 
		(item.relevanceScore || 0) >= 9 &&
		!selectedItems.some(selected => selected.link === item.link)
	);
	for (const item of officialNews) {
		if (selectedItems.length >= 5) break;
		selectedItems.push(item);
		selectedSources.add(item.source);
	}
	
	// Priority 4: Ensure at least 1 international news item (if not already included)
	const internationalSources = ["CNBC", "Reuters", "Bloomberg", "Federal Reserve", "ECB", "IMF", "Nikkei Asia"];
	const hasInternational = selectedItems.some(item => 
		internationalSources.some(source => item.source.includes(source))
	);
	
	if (!hasInternational && selectedItems.length < 5) {
		const internationalNews = sortedItems.filter(item => 
			!selectedItems.some(selected => selected.link === item.link) &&
			internationalSources.some(source => item.source.includes(source)) &&
			(item.relevanceScore || 0) >= 5
		);
		if (internationalNews.length > 0) {
			const topInternational = internationalNews[0];
			selectedItems.push(topInternational);
			selectedTopics.add(topInternational.topic || "GENERAL");
			selectedSources.add(topInternational.source);
			console.log(`[NewsService] Selected international news: ${topInternational.title.substring(0, 50)}...`);
		}
	}
	
	// Priority 5: Fill remaining slots with high-quality news (diverse sources and topics)
	const remainingSlots = 5 - selectedItems.length;
	if (remainingSlots > 0) {
		const remainingNews = sortedItems.filter(item => 
			!selectedItems.some(selected => selected.link === item.link) &&
			(item.relevanceScore || 0) >= 5
		);
		
		// Prefer diversity in sources and topics
		for (const item of remainingNews) {
			if (selectedItems.length >= 5) break;
			
			// Prefer items from sources we haven't used yet
			const isNewSource = !selectedSources.has(item.source);
			// Prefer items with topics we haven't covered yet
			const isNewTopic = item.topic && !selectedTopics.has(item.topic);
			
			// Always add if we have few items, or if it adds diversity
			if (isNewSource || isNewTopic || selectedItems.length < 3 || (item.relevanceScore || 0) >= 8) {
				selectedItems.push(item);
				if (item.topic) selectedTopics.add(item.topic);
				selectedSources.add(item.source);
			}
		}
	}
	
	// Fallback: If we don't have enough items, fill with top remaining items
	if (selectedItems.length < 3) {
		const fallbackNews = sortedItems.filter(item => 
			!selectedItems.some(selected => selected.link === item.link)
		);
		for (const item of fallbackNews.slice(0, 3 - selectedItems.length)) {
			selectedItems.push(item);
			if (item.topic) selectedTopics.add(item.topic);
			selectedSources.add(item.source);
		}
	}
	
	// Final sort by date (most recent first)
	const result = sortByDateDesc(selectedItems);
	
	console.log(`[NewsService] Fetched ${allItems.length} total items, selected ${result.length} high-quality items`);
	console.log(`[NewsService] Sources: ${Array.from(selectedSources).join(", ")}`);
	console.log(`[NewsService] Topics: ${Array.from(selectedTopics).join(", ")}`);
	
	return result;
}

export async function logDailyNewsPreview(): Promise<void> {
	const items = await getDailyJapaneseNews();
	console.log("================ Daily News Preview (JA) ================");
	for (const item of items) {
		const when = item.pubDate ? new Date(item.pubDate).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "";
		const topic = item.topic || "GENERAL";
		const score = item.relevanceScore || 0;
		console.log(`[${item.category}] [${topic}] (Score: ${score}) ${item.title}`);
		console.log(`  出典: ${item.source}`);
		console.log(`  ${item.description}`);
		console.log(`  ${item.link}`);
		if (when) console.log(`  配信: ${when}`);
	}
	console.log("=========================================================");
}
