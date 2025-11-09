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
			
			// Strict filtering: Only include management and economics related content
			if (!isManagementOrEconomicsRelated(title, description)) {
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

function isManagementOrEconomicsRelated(title: string, description: string): boolean {
	const text = `${title} ${description}`.toLowerCase();
	
	// Management and economics keywords (strict filtering)
	const managementEconomicsKeywords = [
		// Management
		"management", "経営", "経営者", "ceo", "cfo", "executive", "経営陣", "企業経営",
		"business", "ビジネス", "企業", "company", "corporation", "corporate",
		"strategy", "戦略", "経営戦略", "business strategy",
		
		// Economics
		"economy", "economic", "経済", "景気", "経済成長", "gdp", "gross domestic product",
		"recession", "不況", "inflation", "インフレ", "deflation", "デフレ",
		"monetary policy", "金融政策", "fiscal policy", "財政政策",
		
		// Finance
		"finance", "financial", "金融", "銀行", "bank", "banking", "credit", "信用",
		"loan", "融資", "investment", "投資", "capital", "資本",
		
		// Currency/Exchange
		"currency", "通貨", "為替", "exchange rate", "為替レート", "yen", "円", "jpy",
		"usd/jpy", "eur/jpy", "円高", "円安",
		
		// Company/Business News
		"company", "企業", "corporation", "earnings", "決算", "業績", "profit", "利益",
		"revenue", "売上", "bankruptcy", "倒産", "ipo", "上場", "merger", "買収",
		"acquisition", "合併", "m&a",
		
		// Market
		"market", "市場", "stock", "株式", "equity", "bond", "債券", "trading", "取引",
		
		// Trade
		"trade", "貿易", "export", "輸出", "import", "輸入", "tariff", "関税",
		
		// Regulation/Policy
		"regulation", "規制", "policy", "政策", "law", "法律", "rule", "規則",
		"ministry", "省", "agency", "庁",
		
		// Industry
		"industry", "産業", "manufacturing", "製造", "service", "サービス",
	];
	
	// Check if text contains management/economics keywords
	const hasKeywords = managementEconomicsKeywords.some(keyword => 
		text.includes(keyword)
	);
	
	// Exclude non-business topics
	const excludeKeywords = [
		"sports", "スポーツ", "entertainment", "エンタメ", "celebrity", "有名人",
		"weather", "天気", "climate", "気候", "地震", "earthquake", "災害", "disaster",
		"politics", "政治", "election", "選挙", "vote", "投票",
		"crime", "犯罪", "arrest", "逮捕", "murder", "殺人",
		"health", "健康", "medical", "医療", "disease", "病気", "covid", "コロナ",
		"education", "教育", "school", "学校", "student", "学生",
		"technology", "技術", "ai", "artificial intelligence", "robot", "ロボット",
		"science", "科学", "research", "研究", "discovery", "発見",
	];
	
	const hasExcludeKeywords = excludeKeywords.some(keyword => 
		text.includes(keyword) && !text.includes("business") && !text.includes("企業")
	);
	
	return hasKeywords && !hasExcludeKeywords;
}

function classifyTopic(title: string, description: string): NewsTopic {
	const text = `${title} ${description}`.toLowerCase();
	
	// Currency exchange rates (JPY, yen, USD/JPY, exchange rate)
	if (/\b(jpy|yen|為替|exchange rate|usd\/jpy|eur\/jpy|currency|通貨|レート|円高|円安|為替レート|為替相場)\b/i.test(text)) {
		return "CURRENCY";
	}
	
	// Company news (bankruptcy, rise, earnings, IPO, merger)
	if (/\b(倒産|bankruptcy|破綻|上場|ipo|merger|acquisition|earnings|決算|業績|会社|company|企業|corporate|ceo|cfo|経営者)\b/i.test(text)) {
		return "COMPANY";
	}
	
	// Finance (banking, financial, credit, loan)
	if (/\b(finance|financial|bank|banking|credit|loan|金融|銀行|融資|信用|投資|investment)\b/i.test(text)) {
		return "FINANCE";
	}
	
	// Economy (economic, GDP, growth, recession)
	if (/\b(economy|economic|gdp|growth|recession|景気|経済|成長|不況|インフレ|inflation|デフレ|deflation)\b/i.test(text)) {
		return "ECONOMY";
	}
	
	// Trade (trade, export, import, tariff)
	if (/\b(trade|export|import|tariff|貿易|輸出|輸入|関税)\b/i.test(text)) {
		return "TRADE";
	}
	
	// Regulation (regulation, policy, law, rule)
	if (/\b(regulation|policy|law|rule|規制|政策|法律|規則|省|ministry|庁|agency)\b/i.test(text)) {
		return "REGULATION";
	}
	
	// Market (stock market, market, equity, bond)
	if (/\b(market|stock|equity|bond|株式|市場|債券|取引|trading)\b/i.test(text)) {
		return "MARKET";
	}
	
	return "GENERAL";
}

function isJapaneseDomesticNews(item: NewsItem): boolean {
	const text = `${item.title} ${item.description}`.toLowerCase();
	const source = item.source.toLowerCase();
	
	// Step 1: Check for international sources first (explicitly exclude)
	const internationalSources = [
		"cnbc", "reuters", "bloomberg", "federal reserve", "frb",
		"ecb", "european central bank", "imf", "world bank",
		"nikkei asia", "asia", "asian", "international", "global",
	];
	
	const isInternationalSource = internationalSources.some(src => source.includes(src));
	if (isInternationalSource) {
		return false; // Definitely international
	}
	
	// Step 2: Check for Japanese sources (strict matching)
	const japaneseSources = [
		"nhk",
		"nikkei", "日経", "日本経済新聞", "日本経済",
		"fsa", "金融庁", "meti", "経済産業省", "mof", "財務省",
		"jpx", "日本取引所", "boj", "日本銀行", "日本中央銀行",
		"東京", "tokyo", "大阪", "osaka",
	];
	
	// Check if it's Nikkei Asia (international) - double check
	if (source.includes("nikkei") && source.includes("asia")) {
		return false; // Nikkei Asia is international
	}
	
	const isJapaneseSource = japaneseSources.some(src => source.includes(src));
	
	// If source is clearly Japanese, it's domestic
	if (isJapaneseSource) {
		return true;
	}
	
	// Check for Japanese keywords in content (strong indicators)
	const strongJapaneseKeywords = [
		"日本の", "日本企業", "日本経済", "日本の", "国内企業",
		"東京", "tokyo", "大阪", "osaka", "名古屋", "nagoya",
		"財務省", "経済産業省", "金融庁", "日本銀行", "日銀",
		"日本取引所", "東証", "上場", "倒産", "経営破綻",
	];
	
	const hasStrongJapaneseKeywords = strongJapaneseKeywords.some(keyword => text.includes(keyword));
	if (hasStrongJapaneseKeywords) {
		return true;
	}
	
	// Check for Japanese context keywords
	const japaneseContextKeywords = [
		"日本", "japan", "japanese", "国内", "domestic",
		"円", "yen", "jpy", "為替", "経済", "景気",
		"企業", "会社", "経営", "ビジネス",
	];
	
	const hasJapaneseContext = japaneseContextKeywords.some(keyword => text.includes(keyword));
	
	// If has Japanese context and not clearly international, consider it Japanese
	// But exclude if it's clearly about other countries
	const otherCountryKeywords = [
		"china", "chinese", "中国", "usa", "us", "united states", "アメリカ",
		"europe", "eu", "european", "ヨーロッパ", "欧州",
		"korea", "south korea", "韓国", "uk", "britain", "イギリス",
	];
	
	const hasOtherCountryKeywords = otherCountryKeywords.some(keyword => text.includes(keyword));
	if (hasOtherCountryKeywords && !hasStrongJapaneseKeywords) {
		return false;
	}
	
	return hasJapaneseContext;
}

function calculateRelevanceScore(
	title: string,
	description: string,
	topic: NewsTopic,
	config: FeedConfig
): number {
	let score = config.priority; // Start with feed priority
	
	const text = `${title} ${description}`.toLowerCase();
	const source = config.source.toLowerCase();
	
	// Strong boost for Japanese official sources (FSA, METI, MOF, JPX, BOJ, NHK, Nikkei)
	const isJapaneseOfficialSource = /(nhk|nikkei|日経|fsa|金融庁|meti|経済産業省|mof|財務省|jpx|日本取引所|boj|日本銀行)/.test(source);
	if (isJapaneseOfficialSource) {
		score += 5; // Very high boost for Japanese official sources
	}
	
	// Boost for Japanese domestic content
	const isJapaneseContent = /\b(日本|japan|japanese|日本の|国内|domestic|東京|tokyo|大阪|osaka|名古屋|nagoya)\b/i.test(text);
	if (isJapaneseContent) {
		score += 4; // High boost for Japanese content
	}
	
	// Boost score for high-priority topics
	if (topic === "CURRENCY") {
		// Strong boost for JPY-specific currency news
		if (/\b(jpy|yen|円|usd\/jpy|eur\/jpy|gbp\/jpy|為替レート|為替相場|円相場|円高|円安)\b/i.test(text)) {
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
		if (/\b(決算|earnings|業績|収益|利益|売上|profit|revenue)\b/i.test(text)) {
			score += 4; // Boost for earnings news
		}
		if (/\b(買収|merger|acquisition|合併|m&a)\b/i.test(text)) {
			score += 3; // Boost for M&A news
		}
		// Management keywords
		if (/\b(経営|management|ceo|cfo|executive|経営者|経営陣)\b/i.test(text)) {
			score += 3; // Boost for management content
		}
		score += 2; // Base boost for company topic
	}
	
	// Boost for finance and economy topics
	if (topic === "FINANCE") {
		if (/\b(銀行|bank|金融機関|financial institution|金融政策)\b/i.test(text)) {
			score += 3; // Boost for banking/news
		}
		if (isJapaneseContent) {
			score += 2; // Additional boost for Japanese finance news
		}
		score += 2;
	}
	
	if (topic === "ECONOMY") {
		if (/\b(日本|japan|japanese|gdp|景気|経済成長|経済政策)\b/i.test(text)) {
			score += 4; // Boost for Japanese economy news
		}
		if (/\b(management|経営|ビジネス|business)\b/i.test(text)) {
			score += 2; // Boost for management-related economy news
		}
		score += 2;
	}
	
	// Boost for management-related content
	if (/\b(経営|management|経営戦略|business strategy|経営者|executive)\b/i.test(text)) {
		score += 3; // Boost for management content
	}
	
	// Boost if topic matches feed's expected topics
	if (config.topics.includes(topic)) {
		score += 1;
	}
	
	// Boost for official government sources (FSA, METI, MOF, etc.)
	if (config.priority >= 10) {
		score += 3; // Increased boost for official sources
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
	// Strict filtering for management and economics content only
	// Filter and prioritize:
	// 1. Management and economics related content only
	// 2. Currency exchange rate news (especially JPY)
	// 3. Japanese company news (bankruptcies, rises, major events)
	// 4. Finance and economy news from official sources
	// 5. Recent news (within last 7 days)
	
	const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
	
	return items.filter(item => {
		// Additional strict filtering for management/economics
		if (!isManagementOrEconomicsRelated(item.title, item.description)) {
			return false;
		}
		
		// Filter out very old news (older than 30 days)
		if (item.pubDate) {
			const pubDate = Date.parse(item.pubDate);
			if (pubDate < Date.now() - (30 * 24 * 60 * 60 * 1000)) {
				return false;
			}
		}
		
		// Keep all items from high-priority sources (official Japanese sources)
		if ((item.relevanceScore || 0) >= 9) {
			return true;
		}
		
		// Keep currency and company news (high priority topics)
		if (item.topic === "CURRENCY" || item.topic === "COMPANY") {
			return true;
		}
		
		// Keep finance/economy/market/trade/regulation news
		if (["FINANCE", "ECONOMY", "MARKET", "TRADE", "REGULATION"].includes(item.topic || "")) {
			return true;
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
	
	// Select 6 items total:
	// - 4 Japanese domestic news items (management and economics focused)
	// - 2 global/international news items (management and economics focused)
	
	// Separate Japanese domestic and global news
	const japaneseItems = sortedItems.filter(item => isJapaneseDomesticNews(item));
	const globalItems = sortedItems.filter(item => !isJapaneseDomesticNews(item));
	
	console.log(`[NewsService] Found ${japaneseItems.length} Japanese domestic items and ${globalItems.length} global items`);
	
	const selectedJapaneseItems: NewsItem[] = [];
	const selectedGlobalItems: NewsItem[] = [];
	const selectedTopics = new Set<NewsTopic>();
	const selectedSources = new Set<string>();
	
	// ===== SELECT 4 JAPANESE DOMESTIC ITEMS =====
	
	// Priority 1: Currency exchange rate news (especially JPY) - Japanese domestic
	const japaneseCurrencyNews = japaneseItems.filter(item => 
		item.topic === "CURRENCY" &&
		/\b(jpy|yen|円|為替|exchange rate|usd\/jpy|eur\/jpy|為替レート|為替相場)\b/i.test(`${item.title} ${item.description}`)
	);
	if (japaneseCurrencyNews.length > 0 && selectedJapaneseItems.length < 4) {
		const topCurrency = japaneseCurrencyNews[0];
		selectedJapaneseItems.push(topCurrency);
		selectedTopics.add(topCurrency.topic!);
		selectedSources.add(topCurrency.source);
		console.log(`[NewsService] Selected Japanese currency news: ${topCurrency.title.substring(0, 50)}...`);
	}
	
	// Priority 2: Japanese company news (bankruptcies, IPOs, earnings, M&A)
	const japaneseCompanyNews = japaneseItems.filter(item => 
		item.topic === "COMPANY" && 
		/\b(倒産|bankruptcy|破綻|上場|ipo|新規上場|決算|earnings|業績|買収|merger|合併)\b/i.test(`${item.title} ${item.description}`)
	);
	
	// Prioritize bankruptcies and IPOs
	const bankruptcyNews = japaneseCompanyNews.filter(item => 
		/\b(倒産|bankruptcy|破綻|経営破綻)\b/i.test(`${item.title} ${item.description}`)
	);
	const ipoNews = japaneseCompanyNews.filter(item => 
		/\b(上場|ipo|新規上場)\b/i.test(`${item.title} ${item.description}`)
	);
	
	// Add bankruptcy news (high impact)
	if (bankruptcyNews.length > 0 && selectedJapaneseItems.length < 4) {
		const topBankruptcy = bankruptcyNews[0];
		if (!selectedJapaneseItems.some(item => item.link === topBankruptcy.link)) {
			selectedJapaneseItems.push(topBankruptcy);
			selectedTopics.add(topBankruptcy.topic!);
			selectedSources.add(topBankruptcy.source);
			console.log(`[NewsService] Selected Japanese company news (bankruptcy): ${topBankruptcy.title.substring(0, 50)}...`);
		}
	}
	
	// Add IPO news
	if (ipoNews.length > 0 && selectedJapaneseItems.length < 4) {
		const topIpo = ipoNews[0];
		if (!selectedJapaneseItems.some(item => item.link === topIpo.link)) {
			selectedJapaneseItems.push(topIpo);
			selectedTopics.add(topIpo.topic!);
			selectedSources.add(topIpo.source);
			console.log(`[NewsService] Selected Japanese company news (IPO): ${topIpo.title.substring(0, 50)}...`);
		}
	}
	
	// Add other important Japanese company news (earnings, M&A)
	if (selectedJapaneseItems.length < 4) {
		const otherCompanyNews = japaneseCompanyNews.filter(item => 
			!bankruptcyNews.includes(item) && 
			!ipoNews.includes(item) &&
			!selectedJapaneseItems.some(selected => selected.link === item.link)
		);
		if (otherCompanyNews.length > 0) {
			const topOther = otherCompanyNews[0];
			selectedJapaneseItems.push(topOther);
			selectedTopics.add(topOther.topic!);
			selectedSources.add(topOther.source);
		}
	}
	
	// Priority 3: High-priority official Japanese sources (FSA, METI, MOF, JPX, BOJ)
	const officialJapaneseNews = japaneseItems.filter(item => 
		(item.relevanceScore || 0) >= 9 &&
		!selectedJapaneseItems.some(selected => selected.link === item.link)
	);
	for (const item of officialJapaneseNews) {
		if (selectedJapaneseItems.length >= 4) break;
		selectedJapaneseItems.push(item);
		selectedTopics.add(item.topic || "GENERAL");
		selectedSources.add(item.source);
	}
	
	// Priority 4: Fill remaining Japanese slots with high-quality Japanese news
	while (selectedJapaneseItems.length < 4) {
		const remainingJapaneseNews = japaneseItems.filter(item => 
			!selectedJapaneseItems.some(selected => selected.link === item.link) &&
			(item.relevanceScore || 0) >= 5
		);
		if (remainingJapaneseNews.length === 0) break;
		
		// Prefer diversity in topics
		const nextItem = remainingJapaneseNews.find(item => 
			item.topic && !selectedTopics.has(item.topic)
		) || remainingJapaneseNews[0];
		
		selectedJapaneseItems.push(nextItem);
		if (nextItem.topic) selectedTopics.add(nextItem.topic);
		selectedSources.add(nextItem.source);
	}
	
	// ===== SELECT 2 GLOBAL/INTERNATIONAL ITEMS =====
	
	// Priority 1: High-quality global finance/economy news
	const highQualityGlobalNews = globalItems.filter(item => 
		(item.relevanceScore || 0) >= 6 &&
		["FINANCE", "ECONOMY", "CURRENCY", "MARKET", "TRADE"].includes(item.topic || "")
	);
	
	for (const item of highQualityGlobalNews) {
		if (selectedGlobalItems.length >= 2) break;
		if (!selectedGlobalItems.some(selected => selected.link === item.link)) {
			selectedGlobalItems.push(item);
			selectedTopics.add(item.topic || "GENERAL");
			selectedSources.add(item.source);
			console.log(`[NewsService] Selected global news: ${item.title.substring(0, 50)}...`);
		}
	}
	
	// Priority 2: Fill remaining global slots with diverse global news
	while (selectedGlobalItems.length < 2) {
		const remainingGlobalNews = globalItems.filter(item => 
			!selectedGlobalItems.some(selected => selected.link === item.link) &&
			(item.relevanceScore || 0) >= 5
		);
		if (remainingGlobalNews.length === 0) break;
		
		// Prefer diversity in sources and topics
		const nextItem = remainingGlobalNews.find(item => 
			(item.topic && !selectedTopics.has(item.topic)) || 
			!selectedSources.has(item.source)
		) || remainingGlobalNews[0];
		
		selectedGlobalItems.push(nextItem);
		if (nextItem.topic) selectedTopics.add(nextItem.topic);
		selectedSources.add(nextItem.source);
	}
	
	// Combine selected items (4 Japanese + 2 Global = 6 total)
	const selectedItems = [...selectedJapaneseItems, ...selectedGlobalItems];
	
	// Fallback: If we don't have enough items, fill with top remaining items
	if (selectedItems.length < 4) {
		const fallbackNews = sortedItems.filter(item => 
			!selectedItems.some(selected => selected.link === item.link)
		);
		for (const item of fallbackNews.slice(0, Math.min(6 - selectedItems.length, fallbackNews.length))) {
			selectedItems.push(item);
			if (item.topic) selectedTopics.add(item.topic);
			selectedSources.add(item.source);
		}
	}
	
	// Final sort by date (most recent first)
	const result = sortByDateDesc(selectedItems);
	
	const japaneseCount = result.filter(item => isJapaneseDomesticNews(item)).length;
	const globalCount = result.length - japaneseCount;
	
	console.log(`[NewsService] Fetched ${allItems.length} total items, selected ${result.length} high-quality items`);
	console.log(`[NewsService] Japanese domestic: ${japaneseCount} items, Global: ${globalCount} items`);
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