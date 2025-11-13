import NewsDataApiClient from "newsdataapi";
import { ENV } from "../env.js";
import { isNewsCategory, type NewsCategory } from "../utils/news-categories.js";

export type Industry = 
	| "MANUFACTURING" // 製造業
	| "IT_TECHNOLOGY" // IT・テクノロジー
	| "HEALTHCARE_WELFARE" // 医療・福祉
	| "RETAIL_SERVICE" // 小売・サービス
	| "FINANCE_INSURANCE" // 金融・保険
	| "REAL_ESTATE_BUILDING" // 不動産・建築
	| "EDUCATION_HUMAN_RESOURCES" // 教育・人材
	| "GENERAL"; // その他・一般

export type NewsOrigin =
	| "japan"
	| "overseas_business"
	| "crypto"
	| "market"
	| "interest";

export type NewsItem = {
	category: NewsCategory;
	categories: NewsCategory[];
	title: string;
	description: string;
	link: string;
	pubDate?: string;
	source: string;
	country?: string;
	language?: string;
	origin: NewsOrigin;
	industries?: Industry[];
};

type NewsDataArticle = {
	 title?: string;
	description?: string;
	content?: string;
	summary?: string;
	 link?: string;
	url?: string;
	source_id?: string;
	source_url?: string;
	source?: string;
	category?: string[] | string;
	country?: string[] | string;
	language?: string;
	 pubDate?: string;
	image_url?: string;
	[key: string]: unknown;
};

type NewsDataResponse = {
	status?: string;
	results?: NewsDataArticle[];
	totalResults?: number;
	nextPage?: string | null;
	message?: string;
};

type FetchParams = Record<string, string | number | boolean | undefined>;

const CATEGORY_ALIASES: Record<string, NewsCategory> = {
	general: "top",
	economy: "business",
	finance: "business",
	travel: "tourism",
	business: "business",
};

const DEFAULT_INTEREST_KEYWORDS = ["ai", "sustainability", "startup"];
const TOTAL_TARGET = 13; // 4 + 2 + 3 + 2 + 2
const FETCH_BUFFER = 6;

const client = new NewsDataApiClient({ apikey: ENV.NEWSDATA_API_KEY });

function normaliseCategory(raw: string | undefined | null): NewsCategory | null {
	if (!raw) return null;
	const lower = raw.toLowerCase();
	if (isNewsCategory(lower)) {
		return lower;
	}
	if (CATEGORY_ALIASES[lower]) {
		return CATEGORY_ALIASES[lower];
	}
	return null;
}

function extractCategories(article: NewsDataArticle, fallback: NewsCategory): NewsCategory[] {
	const rawCategories = article.category;
	const values = Array.isArray(rawCategories) ? rawCategories : rawCategories ? [rawCategories] : [];
	const mapped = values
		.map((value) => normaliseCategory(typeof value === "string" ? value : String(value)))
		.filter((cat): cat is NewsCategory => Boolean(cat));

	if (mapped.length > 0) {
		return Array.from(new Set(mapped));
	}
	return [fallback];
}

function extractCountry(article: NewsDataArticle): string | undefined {
	const raw = article.country;
	if (!raw) return undefined;
	if (Array.isArray(raw)) {
		return raw[0]?.toLowerCase();
	}
	return String(raw).toLowerCase();
}

function toNewsItem(article: NewsDataArticle, fallbackCategory: NewsCategory, origin: NewsOrigin): NewsItem | null {
	const title = (article.title || "").trim();
	const description = (article.description || article.summary || article.content || "").trim();
	const link = (article.link || article.url || "").trim();

	if (!title || !link) {
				return null;
			}
			
	const categories = extractCategories(article, fallbackCategory);
			
			return {
		category: categories[0] ?? fallbackCategory,
		categories,
				title,
				description,
		link,
		pubDate: article.pubDate ? new Date(article.pubDate).toISOString() : undefined,
		source: article.source_id || article.source || article.source_url || "NewsData.io",
		country: extractCountry(article),
		language: article.language,
		origin,
	};
}

async function fetchNews(
	params: FetchParams,
	limit: number,
	fallbackCategory: NewsCategory,
	origin: NewsOrigin
): Promise<NewsItem[]> {
	try {
		const response = (await client.news_api({
			page: 1,
			...params,
		})) as NewsDataResponse;

		if (response.status !== "success") {
			console.warn("[NewsService] NewsData.io returned non-success status:", response.status, response.message);
			return [];
		}

		const articles = response.results ?? [];

		const items = articles
			.map((article) => toNewsItem(article, fallbackCategory, origin))
			.filter((item): item is NewsItem => item !== null)
			.slice(0, limit + FETCH_BUFFER);
		
		console.log(
			`[NewsService] Retrieved ${items.length} ${origin} items (requested ${limit}) with params`,
			JSON.stringify(params)
		);

		return items;
	} catch (error) {
		console.error("[NewsService] Failed to fetch NewsData.io results:", error);
		return [];
	}
}

function selectQuota(items: NewsItem[], limit: number, seen: Set<string>): NewsItem[] {
	const selected: NewsItem[] = [];

	for (const item of items) {
		const key = (item.link || item.title).toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		selected.push(item);
		if (selected.length >= limit) break;
	}
	
	return selected;
}

function deduplicate(allItems: NewsItem[]): NewsItem[] {
	const seen = new Set<string>();
	return allItems.filter((item) => {
		const key = (item.link || item.title).toLowerCase();
		if (seen.has(key)) {
			return false;
	}
		seen.add(key);
		return true;
	});
}

function sortByDateDesc(items: NewsItem[]): NewsItem[] {
	return [...items].sort((a, b) => {
		const at = a.pubDate ? Date.parse(a.pubDate) : 0;
		const bt = b.pubDate ? Date.parse(b.pubDate) : 0;
		return bt - at;
	});
}

function resolveInterestKeywords(): string[] {
	return ENV.NEWS_INTEREST_KEYWORDS.length > 0 ? ENV.NEWS_INTEREST_KEYWORDS : DEFAULT_INTEREST_KEYWORDS;
}

export async function getDailyJapaneseNews(): Promise<NewsItem[]> {
	const [japanNews, overseasBusinessNews, cryptoNews, marketNews, interestNews] = await Promise.all([
		fetchNews(
			{
				country: "jp",
				language: "ja",
				category: "top",
			},
			6,
			"top",
			"japan"
		),
		fetchNews(
			{
				category: "business",
				language: "en",
				country: "us",
			},
			6,
			"business",
			"overseas_business"
		),
		fetchNews(
			{
				q: "bitcoin OR ethereum OR ripple OR solana",
				category: "business",
				language: "en",
			},
			6,
			"business",
			"crypto"
		),
		fetchNews(
			{
				q: "\"stock market\" OR \"financial market\" OR \"equity market\"",
				category: "business",
				language: "en",
			},
			6,
			"business",
			"market"
		),
		Promise.all(
			resolveInterestKeywords().map((keyword) =>
				fetchNews(
					{
						q: keyword,
					},
					3,
					"other",
					"interest"
				)
			)
		).then((groups) => deduplicate(groups.flat())),
	]);

	const pool = {
		japan: deduplicate(japanNews),
		overseas_business: deduplicate(overseasBusinessNews),
		crypto: deduplicate(cryptoNews),
		market: deduplicate(marketNews),
		interest: deduplicate(interestNews),
	};

	const seen = new Set<string>();
	const selection: NewsItem[] = [];

	const quotas: Array<{ origin: NewsOrigin; limit: number }> = [
		{ origin: "japan", limit: 4 },
		{ origin: "overseas_business", limit: 2 },
		{ origin: "crypto", limit: 3 },
		{ origin: "market", limit: 2 },
		{ origin: "interest", limit: 2 },
	];

	for (const { origin, limit } of quotas) {
		const items = selectQuota(pool[origin], limit, seen);
		selection.push(...items);
	}
	
	const remainingCandidates = deduplicate(
		[...pool.japan, ...pool.overseas_business, ...pool.crypto, ...pool.market, ...pool.interest].filter(
			(item) => !seen.has((item.link || item.title).toLowerCase())
		)
	);

	for (const candidate of remainingCandidates) {
		if (selection.length >= TOTAL_TARGET) break;
		const key = (candidate.link || candidate.title).toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		selection.push(candidate);
	}

	const sorted = sortByDateDesc(selection);

	console.log(
		`[NewsService] Selected ${sorted.length} total items (Japan=${selection.filter(
			(item) => item.origin === "japan"
		).length}, Overseas=${selection.filter((item) => item.origin === "overseas_business").length}, Crypto=${
			selection.filter((item) => item.origin === "crypto").length
		}, Market=${selection.filter((item) => item.origin === "market").length}, Interest=${
			selection.filter((item) => item.origin === "interest").length
		})`
	);

	return sorted;
}

export async function logDailyNewsPreview(): Promise<void> {
	const items = await getDailyJapaneseNews();
	console.log("================ Daily News Preview ================");
	for (const item of items) {
		const when = item.pubDate ? new Date(item.pubDate).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "";
		console.log(`[${item.origin}] [${item.category}] ${item.title}`);
		console.log(`  出典: ${item.source} / 言語: ${item.language || "n/a"} / 国: ${item.country || "n/a"}`);
		console.log(`  ${item.description}`);
		console.log(`  ${item.link}`);
		if (when) console.log(`  配信: ${when}`);
	}
	console.log("====================================================");
}