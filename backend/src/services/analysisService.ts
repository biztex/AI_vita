import OpenAI from 'openai';
import { ENV } from '../env.js';
import type { NewsItem, Industry, NewsOrigin } from './newsService.js';
import { NEWS_CATEGORIES, NEWS_CATEGORY_LABELS_JA, type NewsCategory } from '../utils/news-categories.js';

const openai = new OpenAI({ apiKey: ENV.OPENAI_API_KEY });

export type ArticleInsights = {
	keyPoints: string[];
	actionProposal: string; // 行動提案
	importance: string; // 重要性
	risk: string; // リスク
};

export type NewsAnalysis = {
	articles: Array<{
		title: string;
		description: string;
		link: string;
		source: string;
		category: NewsCategory;
		categories: NewsCategory[];
		origin: NewsOrigin;
		country?: string;
		sourceIcon?: string;
		insights: ArticleInsights;
		industries?: Industry[]; // AI-generated industry tags
	}>;
	todoList: Array<{
		category: string; // e.g., "人事", "財務", "BCP"
		action: string;
	}>;
};

export async function analyzeBusinessItemsJA(items: NewsItem[]): Promise<NewsAnalysis> {
	const list = items
		.map((n, i) => `(${i + 1}) タイトル: ${n.title}\n説明: ${n.description}\nリンク: ${n.link}\n出典: ${n.source}`)
		.join('\n\n');

	const system = `あなたは日本語で助言する経営コンサルタントです。各ニュース記事について、実務的な洞察を提供してください。`;

	const user = `以下は本日のビジネス・経済ニュースです（${items.length}件）。

各記事について、以下の形式で分析してください：
1. 主なポイント（Key Points）: 3-5箇条書きで要点をまとめる
2. 行動提案（行動提案）: 経営者が取るべき具体的なアクションを1文で示す（例：「業界内で早期導入事例 → 社内でPoC計画を立案」）
3. 重要性（重要性）: このニュースが経営に与える影響の重要性を1文で示す（例：「中小企業にも直接影響する政策変更」）
4. リスク（リスク）: 対応しない場合のリスクを1文で示す（例：「対応遅れによる罰則・信用低下」）
5. 業界タグ（industries）: このニュースが関連する業界を1-3個選択してください。
   選択可能な業界:
   - MANUFACTURING: 製造業（自動車、機械、電子部品、化学、素材など）
   - IT_TECHNOLOGY: IT・テクノロジー（ソフトウェア、ハードウェア、AI、クラウド、通信など）
   - HEALTHCARE_WELFARE: 医療・福祉（病院、製薬、介護、医療機器など）
   - RETAIL_SERVICE: 小売・サービス（小売店、飲食、ホテル、旅行、エンタメなど）
   - FINANCE_INSURANCE: 金融・保険（銀行、証券、保険、FinTechなど）
   - REAL_ESTATE_BUILDING: 不動産・建築（不動産開発、建設、建材など）
   - EDUCATION_HUMAN_RESOURCES: 教育・人材（教育機関、人材派遣、研修など）
   - GENERAL: その他・一般（該当しない場合や全業界に関わる場合）

さらに、全ての記事を分析した上で、ExecuWellスタイルのアクションリスト（To-Do list）を生成してください。
ExecuWellスタイルの例:
1. 【人事】週休3日制のPoCを実施 → 離職率KPIで追跡
2. 【財務】借入比率の再検討を財務チームへ依頼
3. 【BCP】感染予防マニュアルを再送付・備蓄状況を点検

各アクションは【カテゴリ】形式で分類し（例：【人事】、【財務】、【BCP】、【マーケティング】、【営業】、【法務】、【エネルギー】など）、具体的で実行可能なアクションを記載してください。3-5個のアクションを生成してください。

出力形式（JSON）:
{
	"articles": [
		{
			"title": "記事タイトル",
			"description": "記事説明",
			"link": "記事リンク",
			"source": "出典",
			"insights": {
				"keyPoints": ["ポイント1", "ポイント2", "ポイント3"],
				"actionProposal": "行動提案",
				"importance": "重要性",
				"risk": "リスク"
			},
			"industries": ["MANUFACTURING", "IT_TECHNOLOGY"]
		}
	],
	"todoList": [
		{
			"category": "カテゴリ",
			"action": "アクション内容"
		}
	]
}

ニュース記事:
${list}

JSON形式のみで出力してください。`;

	const completion = await openai.chat.completions.create({
		model: 'gpt-4o-mini',
		messages: [
			{ role: 'system', content: system },
			{ role: 'user', content: user },
		],
		max_tokens: 3000,
		temperature: 0.5,
		response_format: { type: 'json_object' },
	});

	const content = completion.choices[0]?.message?.content?.trim() || '{}';
	
	try {
		const parsed = JSON.parse(content) as NewsAnalysis;
		
		// Match AI-generated insights with original items by title/link
		// Create a map of insights and industries by title for matching
		const insightsMap = new Map<string, { insights: ArticleInsights; industries?: Industry[] }>();
		parsed.articles.forEach(article => {
			const key = article.title.toLowerCase().trim();
			insightsMap.set(key, {
				insights: article.insights,
				industries: article.industries || [],
			});
		});
		
		// Build result: use original items and match insights and industries
		const matchedArticles = items.map(item => {
			const key = item.title.toLowerCase().trim();
			const matched = insightsMap.get(key) || {
				insights: {
					keyPoints: ['分析中...'],
					actionProposal: '分析中...',
					importance: '分析中...',
					risk: '分析中...',
				},
				industries: [],
			};
			
			return {
				title: item.title,
				description: item.description,
				link: item.link,
				source: item.source,
				category: item.category,
				categories: item.categories,
				origin: item.origin,
				country: item.country,
				sourceIcon: item.sourceIcon,
				insights: matched.insights,
				industries: matched.industries,
			};
		});
		
		console.log('[Analysis] Generated insights and industry tags for', matchedArticles.length, 'articles');
		return {
			articles: matchedArticles,
			todoList: parsed.todoList || [],
		};
	} catch (e) {
		console.error('[Analysis] Failed to parse JSON:', e);
		console.error('[Analysis] Raw content:', content);
		// Fallback: create basic structure
		return {
			articles: items.map(item => ({
				title: item.title,
				description: item.description,
				link: item.link,
				source: item.source,
				category: item.category,
				categories: item.categories,
				origin: item.origin,
				country: item.country,
				sourceIcon: item.sourceIcon,
				insights: {
					keyPoints: ['分析に失敗しました'],
					actionProposal: '分析エラーにより表示できません',
					importance: '分析エラーにより表示できません',
					risk: '分析エラーにより表示できません',
				},
				industries: [],
			})),
			todoList: [],
		};
	}
}

export function buildEmailContentJA(
	dateLabel: string, 
	items: NewsItem[], 
	analysis: NewsAnalysis, 
	userCategories: NewsCategory[] = []
): { subject: string; text: string; html: string } {
	const categoryFilterLabel = userCategories.length > 0 
		? `【関心カテゴリ: ${userCategories.map(category => NEWS_CATEGORY_LABELS_JA[category] ?? category).join(', ')}】` 
		: '';
	const subject = `本日のビジネスニュース・経営維持の示唆 ${categoryFilterLabel}(${dateLabel})`;

	const originLabels: Record<NewsOrigin, string> = {
		japan_business: "国内ビジネス",
		global_business: "海外ビジネス",
		crypto: "暗号資産",
		market: "市場動向",
		interest: "関心カテゴリ",
	};

	const industryLabels: Record<string, string> = {
		MANUFACTURING: "製造業",
		IT_TECHNOLOGY: "IT・テクノロジー",
		HEALTHCARE_WELFARE: "医療・福祉",
		RETAIL_SERVICE: "小売・サービス",
		FINANCE_INSURANCE: "金融・保険",
		REAL_ESTATE_BUILDING: "不動産・建築",
		EDUCATION_HUMAN_RESOURCES: "教育・人材",
		GENERAL: "その他・一般",
	};

	const itemLookup = new Map<string, NewsItem>();
	items.forEach((item) => {
		const key = `${item.title}|${item.link}`;
		if (!itemLookup.has(key)) {
			itemLookup.set(key, item);
		}
	});

	const grouped = new Map<NewsCategory, Array<(typeof analysis.articles)[number]>>();
	analysis.articles.forEach((article) => {
		const group = grouped.get(article.category) ?? [];
		group.push(article);
		grouped.set(article.category, group);
	});

	const orderedGroups = NEWS_CATEGORIES.filter((cat) => grouped.has(cat)).map((cat) => [
		cat,
		grouped.get(cat)!,
	] as const);

	// Build text version
	let text = `本日のビジネスニュース (${dateLabel})\n\n`;
	let runningIndex = 1;

	for (const [category, articles] of orderedGroups) {
		const categoryLabel = NEWS_CATEGORY_LABELS_JA[category] ?? category;
		text += `【${categoryLabel}】\n\n`;
		articles.forEach((article) => {
			const key = `${article.title}|${article.link}`;
			const original = itemLookup.get(key);
			const originLabel = original ? originLabels[original.origin] : originLabels[article.origin];
			const countryLabel = (article.country ?? original?.country)?.toUpperCase();
			const sourceIcon = article.sourceIcon ?? original?.sourceIcon;
			text += `${runningIndex}. ${article.title}（${originLabel}）\n`;
			text += `説明: ${article.description}\n\n`;
			text += `主なポイント:\n`;
			article.insights.keyPoints.forEach((point) => {
				text += `- ${point}\n`;
			});
			text += `\n行動提案: ${article.insights.actionProposal}\n`;
			text += `重要性: ${article.insights.importance}\n`;
			text += `リスク: ${article.insights.risk}\n`;
			if (countryLabel) {
				text += `国: ${countryLabel}\n`;
			}
			if (article.industries && article.industries.length > 0) {
				text += `関連業界: ${article.industries.map((ind) => industryLabels[ind] || ind).join(', ')}\n`;
			}
			if (sourceIcon) {
				text += `ソースアイコン: ${sourceIcon}\n`;
			}
			text += `ソース: ${article.link}\n\n`;
			text += `${'='.repeat(50)}\n\n`;
			runningIndex += 1;
		});
	}

	if (analysis.todoList.length > 0) {
		text += `ExecuWell AI提案型アクションリスト\n\n`;
		analysis.todoList.forEach((todo, idx) => {
			text += `${idx + 1}. 【${todo.category}】${todo.action}\n`;
		});
	}

	let html = `
	<div style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
		<h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">本日のビジネスニュース (${escapeHtml(dateLabel)})</h1>
	`;

	runningIndex = 1;
	for (const [category, articles] of orderedGroups) {
		const categoryLabel = NEWS_CATEGORY_LABELS_JA[category] ?? category;
		html += `
		<h2 style="color: #2c3e50; margin-top: 30px; margin-bottom: 15px; font-size: 1.4em; border-bottom: 2px solid #3498db; padding-bottom: 8px;">
			📰 ${escapeHtml(categoryLabel)}
		</h2>
		`;

		articles.forEach((article) => {
			const key = `${article.title}|${article.link}`;
			const original = itemLookup.get(key);
			const originLabel = original ? originLabels[original.origin] : originLabels[article.origin];
			const publishedLabel =
				original?.pubDate ? new Date(original.pubDate).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }) : '';
			const countryLabel = (article.country ?? original?.country)?.toUpperCase();
			const sourceIcon = article.sourceIcon ?? original?.sourceIcon;

			const metadataSegments = [
				`カテゴリ: ${escapeHtml(categoryLabel)}`,
				`区分: ${escapeHtml(originLabel)}`,
			];
			if (countryLabel) {
				metadataSegments.push(`国: ${escapeHtml(countryLabel)}`);
			}
			if (publishedLabel) {
				metadataSegments.push(`配信: ${escapeHtml(publishedLabel)}`);
			}

			html += `
		<div style="margin-bottom: 40px; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px;">
			<h2 style="color: #2c3e50; margin-top: 0; font-size: 1.3em;">${runningIndex}. ${escapeHtml(article.title)}</h2>
			<p style="color: #555; margin: 10px 0;">${escapeHtml(article.description)}</p>
			<p style="margin: 6px 0; color: #7f8c8d; font-size: 0.9em;">${metadataSegments.join(' / ')}</p>
			${sourceIcon ? `<div style="margin: 10px 0;">
				<img src="${escapeAttr(sourceIcon)}" alt="${escapeHtml(article.source)}" style="height: 24px; width: auto;" loading="lazy" />
			</div>` : ''}
			
			<h3 style="color: #2c3e50; margin-top: 20px; font-size: 1.1em;">主なポイント</h3>
			<ul style="margin: 10px 0; padding-left: 20px;">
		`;
			article.insights.keyPoints.forEach((point) => {
				html += `<li style="margin: 5px 0;">${escapeHtml(point)}</li>`;
			});
			html += `
			</ul>
			
			<div style="margin-top: 20px; padding: 15px; background-color: #ffffff; border-radius: 4px;">
				<p style="margin: 8px 0;"><strong style="color: #27ae60;">行動提案:</strong> ${escapeHtml(article.insights.actionProposal)}</p>
				<p style="margin: 8px 0;"><strong style="color: #e67e22;">重要性:</strong> ${escapeHtml(article.insights.importance)}</p>
				<p style="margin: 8px 0;"><strong style="color: #e74c3c;">リスク:</strong> ${escapeHtml(article.insights.risk)}</p>
			</div>
			
			${article.industries && article.industries.length > 0 ? `
			<div style="margin-top: 10px;">
				<strong style="color: #7f8c8d; font-size: 0.9em;">業界タグ: </strong>
				${article.industries.map(ind => `<span style="display: inline-block; background-color: #ecf0f1; color: #2c3e50; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 0.85em;">${escapeHtml(industryLabels[ind] || ind)}</span>`).join('')}
			</div>
			` : ''}
			<p style="margin-top: 15px;">
				<a href="${escapeAttr(article.link)}" style="color: #3498db; text-decoration: none; font-weight: bold;" target="_blank">ソースリンク (${escapeHtml(article.source)}) →</a>
			</p>
		</div>
		`;
			runningIndex += 1;
		});
	}

	if (analysis.todoList.length > 0) {
		html += `
		<div style="margin-top: 40px; padding: 20px; background-color: #2c3e50; color: #ffffff; border-radius: 4px;">
			<h2 style="color: #ffffff; margin-top: 0; font-size: 1.3em;">ExecuWell AI提案型アクションリスト</h2>
			<ol style="margin: 15px 0; padding-left: 25px;">
		`;
		analysis.todoList.forEach((todo) => {
			html += `<li style="margin: 10px 0; color: #ffffff;"><strong>【${escapeHtml(todo.category)}】</strong>${escapeHtml(todo.action)}</li>`;
		});
		html += `
			</ol>
		</div>
		`;
	}

	html += `
	</div>
	`;

	return { subject, text, html };
}

function escapeHtml(s: string): string {
	return (s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function escapeAttr(s: string): string {
	return escapeHtml(s).replace(/"/g, '&quot;');
}
