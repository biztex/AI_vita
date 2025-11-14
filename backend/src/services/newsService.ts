import { ENV } from "../env.js";
import { prisma } from "../prisma.js";
import { isNewsCategory, type NewsCategory } from "../utils/news-categories.js";

const API_BASE_URL = "https://newsdata.io/api/1";
const DEFAULT_REQUEST_SIZE = 12;

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
	| "japan_business"
	| "global_business"
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
	sourceIcon?: string;
	country?: string;
	language?: string;
	origin: NewsOrigin;
	industries?: Industry[];
};

type NewsDataArticle = {
	 title?: string;
	name?: string;
	description?: string;
	content?: string;
	summary?: string;
	snippet?: string;
	 link?: string;
	url?: string;
	source_id?: string;
	source?: string;
	source_url?: string;
	source_icon?: string;
	category?: string[] | string;
	country?: string[] | string;
	language?: string;
	 pubDate?: string;
	image_url?: string;
	coin?: string;
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
	"crypto currency": "business",
};

function normaliseCategory(raw: string | undefined | null): NewsCategory | null {
	if (!raw) return null;
	const lower = raw.trim().toLowerCase();
	if (isNewsCategory(lower)) {
		return lower;
	}
	if (CATEGORY_ALIASES[lower]) {
		return CATEGORY_ALIASES[lower];
	}
				return null;
			}
			
function valueToArray(value: string | string[] | undefined | null): string[] {
	if (!value) return [];
	if (Array.isArray(value)) {
		return value.map((v) => String(v)).filter(Boolean);
	}
	return String(value)
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
}

function extractCategories(article: NewsDataArticle, fallback: NewsCategory): NewsCategory[] {
	const rawCategories = valueToArray(article.category);
	const mapped = rawCategories
		.map((value) => normaliseCategory(value))
		.filter((cat): cat is NewsCategory => Boolean(cat));

	if (mapped.length > 0) {
		return Array.from(new Set(mapped));
	}

	return [fallback];
}

function extractCountry(article: NewsDataArticle): string | undefined {
	const values = valueToArray(article.country);
	if (values.length === 0) return undefined;
	return values[0].toUpperCase();
}

function toNewsItem(article: NewsDataArticle, fallbackCategory: NewsCategory, origin: NewsOrigin): NewsItem | null {
	const rawTitle = article.title || article.name || "";
	const title = rawTitle.trim();
	const rawDescription = article.description || article.summary || article.content || article.snippet || "";
	const description = rawDescription.trim();
	let link = (article.link || article.url || article.source_url || "").trim();

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
		sourceIcon: typeof article.source_icon === "string" ? article.source_icon : undefined,
		country: extractCountry(article),
		language: article.language,
		origin,
	};
}

async function fetchFromNewsData(endpoint: "latest" | "crypto" | "market", params: FetchParams): Promise<NewsDataArticle[]> {
	const url = new URL(`${API_BASE_URL}/${endpoint}`);

	for (const [key, value] of Object.entries(params)) {
		if (value === undefined || value === null || value === "") continue;
		url.searchParams.set(key, String(value));
	}

	url.searchParams.set("apikey", ENV.NEWSDATA_API_KEY);
	console.log(url.toString())
	const response = await fetch(url.toString(), {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
	});
	console.log("latest=>",response);
	

	if (!response.ok) {
		throw new Error(`NewsData.io request failed (${response.status}) for ${endpoint}: ${response.statusText}`);
	}

	const data = (await response.json()) as NewsDataResponse;

	if (data.status && data.status !== "success") {
		console.warn(`[NewsService] NewsData.io responded with status=${data.status} message=${data.message ?? ""}`);
	}

	return Array.isArray(data.results) ? data.results : [];
}

async function fetchLatestSegment(
	params: FetchParams,
	fallbackCategory: NewsCategory,
	origin: NewsOrigin
): Promise<NewsItem[]> {
	try {
		const articles = await fetchFromNewsData("latest", params);
		return articles
			.map((article) => toNewsItem(article, fallbackCategory, origin))
			.filter((item): item is NewsItem => item !== null);
	} catch (error) {
		console.error(`[NewsService] Failed to fetch latest news for ${origin}:`, error);
		return [];
	}
}

async function fetchCryptoSegment(params: FetchParams, fallbackCategory: NewsCategory): Promise<NewsItem[]> {
	try {
		const articles = await fetchFromNewsData("crypto", params);
		return articles
			.map((article) => toNewsItem(article, fallbackCategory, "crypto"))
			.filter((item): item is NewsItem => item !== null);
	} catch (error) {
		console.error("[NewsService] Failed to fetch crypto news:", error);
		return [];
	}
}

async function fetchMarketSegment(params: FetchParams, fallbackCategory: NewsCategory): Promise<NewsItem[]> {
	try {
		const articles = await fetchFromNewsData("market", params);
		return articles
			.map((article) => toNewsItem(article, fallbackCategory, "market"))
			.filter((item): item is NewsItem => item !== null);
	} catch (error) {
		console.error("[NewsService] Failed to fetch market news:", error);
		return [];
	}
}

async function getDistinctUserInterestCategories(): Promise<NewsCategory[]> {
	const users = await prisma.appUser.findMany({
		select: { industries: true },
		where: {
			industries: {
				isEmpty: false,
			},
		},
	});

	const categorySet = new Set<NewsCategory>();
	for (const user of users) {
		for (const category of user.industries ?? []) {
			if (isNewsCategory(category)) {
				categorySet.add(category);
			}
		}
	}

	return Array.from(categorySet);
}

function deduplicate(items: NewsItem[]): NewsItem[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = (item.link || item.title).toLowerCase();
		if (seen.has(key)) return false;
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

/**
 * Fetches the common 10 news items:
 * - 4 latest Japanese business news
 * - 2 global business news
 * - 2 crypto business news
 * - 2 marketing business news
 */
export async function getCommonNews(): Promise<NewsItem[]> {
	const [japanBusiness, globalBusiness, cryptoNews, marketNews] = await Promise.all([
		fetchLatestSegment(
			{
				country: "jp",
				language: "ja",
				category: "business",
				size: 6, // Fetch extra to account for deduplication
			},
			"business",
			"japan_business"
		),
		fetchLatestSegment(
			{
				country: "us,gb",
				language: "en",
				category: "business",
				size: 4, // Fetch extra to account for deduplication
			},
			"business",
			"global_business"
		),
		fetchCryptoSegment(
			{
				coin: "bitcoin,ethereum,usdt",
				language: "en",
				size: 4, // Fetch extra to account for deduplication
			},
			"business"
		),
		fetchMarketSegment(
			{
				country: "jp,us",
				language: "ja,en",
				size: 4, // Fetch extra to account for deduplication
			},
			"business"
		),
	]);

	const segments: Array<{ origin: NewsOrigin; items: NewsItem[]; limit: number }> = [
		{ origin: "japan_business", items: deduplicate(japanBusiness), limit: 4 },
		{ origin: "global_business", items: deduplicate(globalBusiness), limit: 2 },
		{ origin: "crypto", items: deduplicate(cryptoNews), limit: 2 },
		{ origin: "market", items: deduplicate(marketNews), limit: 2 },
	];

	const seen = new Set<string>();
	const selection: NewsItem[] = [];

	for (const segment of segments) {
		const ordered = sortByDateDesc(segment.items);
		let count = 0;
		for (const item of ordered) {
			const key = (item.link || item.title).toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			selection.push(item);
			count += 1;
			if (count >= segment.limit) break;
		}
	}

	console.log(
		`[NewsService] Common news → JP Business: ${selection.filter((item) => item.origin === "japan_business").length}, ` +
			`Global Business: ${selection.filter((item) => item.origin === "global_business").length}, ` +
			`Crypto: ${selection.filter((item) => item.origin === "crypto").length}, ` +
			`Market: ${selection.filter((item) => item.origin === "market").length} ` +
			`(Total: ${selection.length})`
	);

	return sortByDateDesc(selection);
}

/**
 * Fetches 2 news items per user's preferred category
 */
export async function getUserInterestNews(userCategories: NewsCategory[]): Promise<NewsItem[]> {
	if (userCategories.length === 0) {
		return [];
	}

	const seen = new Set<string>();
	const allInterestNews: NewsItem[] = [];

	// Fetch 2 news items per category
	for (const category of userCategories) {
		try {
			const items = await fetchLatestSegment(
				{
					category: category,
					language: "ja,en",
					size: 4, // Fetch extra to account for deduplication
				},
				category,
				"interest"
			);

			const deduplicated = deduplicate(items);
			const sorted = sortByDateDesc(deduplicated);
			let count = 0;

			for (const item of sorted) {
				const key = (item.link || item.title).toLowerCase();
				if (seen.has(key)) continue;
				seen.add(key);
				allInterestNews.push(item);
				count += 1;
				if (count >= 2) break; // 2 per category
			}
		} catch (error) {
			console.error(`[NewsService] Failed to fetch interest news for category ${category}:`, error);
		}
	}

	console.log(
		`[NewsService] User interest news → ${allInterestNews.length} items for categories: ${userCategories.join(", ")}`
	);

	return sortByDateDesc(allInterestNews);
}

/**
 * Fetches all daily news: 10 common + user-specific interest news
 * This is the main function used by the scheduler
 */
export async function getDailyJapaneseNews(): Promise<NewsItem[]> {
	const commonNews = await getCommonNews();
	return commonNews;
}

export async function logDailyNewsPreview(): Promise<void> {
	const items = await getDailyJapaneseNews();
	console.log("================ Daily News Preview ================");
	for (const item of items) {
		const when = item.pubDate ? new Date(item.pubDate).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) : "";
		console.log(`[${item.origin}] [${item.category}] ${item.title}`);
		console.log(
			`  出典: ${item.source}` +
				(item.country ? ` / 国: ${item.country}` : "") +
				(item.language ? ` / 言語: ${item.language}` : "")
		);
		if (item.sourceIcon) {
			console.log(`  アイコン: ${item.sourceIcon}`);
		}
		if (item.description) {
		console.log(`  ${item.description}`);
		}
		console.log(`  ${item.link}`);
		if (when) console.log(`  配信: ${when}`);
	}
	console.log("====================================================");
}