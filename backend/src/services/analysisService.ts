import OpenAI from 'openai';
import { ENV } from '../env.js';
import type { NewsItem } from './newsService.js';

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
		insights: ArticleInsights;
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
			}
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
		// Create a map of insights by title for matching
		const insightsMap = new Map<string, ArticleInsights>();
		parsed.articles.forEach(article => {
			const key = article.title.toLowerCase().trim();
			insightsMap.set(key, article.insights);
		});
		
		// Build result: use original items and match insights
		const matchedArticles = items.map(item => {
			const key = item.title.toLowerCase().trim();
			const insights = insightsMap.get(key) || {
				keyPoints: ['分析中...'],
				actionProposal: '分析中...',
				importance: '分析中...',
				risk: '分析中...',
			};
			
			return {
				title: item.title,
				description: item.description,
				link: item.link,
				source: item.source,
				insights: insights,
			};
		});
		
		console.log('[Analysis] Generated insights for', matchedArticles.length, 'articles');
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
				insights: {
					keyPoints: ['分析に失敗しました'],
					actionProposal: '分析エラーにより表示できません',
					importance: '分析エラーにより表示できません',
					risk: '分析エラーにより表示できません',
				},
			})),
			todoList: [],
		};
	}
}

export function buildEmailContentJA(dateLabel: string, items: NewsItem[], analysis: NewsAnalysis): { subject: string; text: string; html: string } {
	const subject = `本日のビジネスニュース・経営維持の示唆 (${dateLabel})`;

	// Build text version
	let text = `本日のビジネスニュース (${dateLabel})\n\n`;
	
	for (let i = 0; i < analysis.articles.length; i++) {
		const article = analysis.articles[i];
		text += `${i + 1}. ${article.title}\n`;
		text += `説明: ${article.description}\n\n`;
		text += `主なポイント:\n`;
		article.insights.keyPoints.forEach(point => {
			text += `- ${point}\n`;
		});
		text += `\n行動提案: ${article.insights.actionProposal}\n`;
		text += `重要性: ${article.insights.importance}\n`;
		text += `リスク: ${article.insights.risk}\n`;
		text += `ソース: ${article.link}\n\n`;
		text += `${'='.repeat(50)}\n\n`;
	}

	// Add To-Do list
	if (analysis.todoList.length > 0) {
		text += `ExecuWell AI提案型アクションリスト\n\n`;
		analysis.todoList.forEach((todo, idx) => {
			text += `${idx + 1}. 【${todo.category}】${todo.action}\n`;
		});
	}

	// Build HTML version
	let html = `
	<div style="font-family: 'Helvetica Neue', Arial, 'Hiragino Kaku Gothic ProN', 'Hiragino Sans', Meiryo, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; color: #333;">
		<h1 style="color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px;">本日のビジネスニュース (${escapeHtml(dateLabel)})</h1>
	`;

	for (let i = 0; i < analysis.articles.length; i++) {
		const article = analysis.articles[i];
		html += `
		<div style="margin-bottom: 40px; padding: 20px; background-color: #f8f9fa; border-left: 4px solid #3498db; border-radius: 4px;">
			<h2 style="color: #2c3e50; margin-top: 0; font-size: 1.3em;">${i + 1}. ${escapeHtml(article.title)}</h2>
			<p style="color: #555; margin: 10px 0;">${escapeHtml(article.description)}</p>
			
			<h3 style="color: #2c3e50; margin-top: 20px; font-size: 1.1em;">主なポイント</h3>
			<ul style="margin: 10px 0; padding-left: 20px;">
		`;
		article.insights.keyPoints.forEach(point => {
			html += `<li style="margin: 5px 0;">${escapeHtml(point)}</li>`;
		});
		html += `
			</ul>
			
			<div style="margin-top: 20px; padding: 15px; background-color: #ffffff; border-radius: 4px;">
				<p style="margin: 8px 0;"><strong style="color: #27ae60;">行動提案:</strong> ${escapeHtml(article.insights.actionProposal)}</p>
				<p style="margin: 8px 0;"><strong style="color: #e67e22;">重要性:</strong> ${escapeHtml(article.insights.importance)}</p>
				<p style="margin: 8px 0;"><strong style="color: #e74c3c;">リスク:</strong> ${escapeHtml(article.insights.risk)}</p>
			</div>
			
			<p style="margin-top: 15px;">
				<a href="${escapeAttr(article.link)}" style="color: #3498db; text-decoration: none; font-weight: bold;" target="_blank">ソースリンク (${escapeHtml(article.source)}) →</a>
			</p>
		</div>
		`;
	}

	// Add To-Do list
	if (analysis.todoList.length > 0) {
		html += `
		<div style="margin-top: 40px; padding: 20px; background-color: #2c3e50; color: #ffffff; border-radius: 4px;">
			<h2 style="color: #ffffff; margin-top: 0; font-size: 1.3em;">ExecuWell AI提案型アクションリスト</h2>
			<ol style="margin: 15px 0; padding-left: 25px;">
		`;
		analysis.todoList.forEach((todo, idx) => {
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
