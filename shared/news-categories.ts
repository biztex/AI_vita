export const NEWS_CATEGORIES = [
	"business",
	"crime",
	"education",
	"entertainment",
	"environment",
	"food",
	"health",
	"lifestyle",
	"politics",
	"science",
	"sports",
	"technology",
	"top",
	"tourism",
	"world",
	"other"
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export function isNewsCategory(value: unknown): value is NewsCategory {
	return typeof value === "string" && NEWS_CATEGORIES.includes(value as NewsCategory);
}

export const NEWS_CATEGORY_LABELS_JA: Record<NewsCategory, string> = {
	business: "ビジネス",
	crime: "犯罪・コンプライアンス",
	education: "教育",
	entertainment: "エンタメ",
	environment: "環境・サステナビリティ",
	food: "食・フードサービス",
	health: "ヘルスケア",
	lifestyle: "ライフスタイル",
	politics: "政治",
	science: "科学",
	sports: "スポーツ",
	technology: "テクノロジー",
	top: "主要ニュース",
	tourism: "観光",
	world: "国際・海外",
	other: "その他",
} as const;

