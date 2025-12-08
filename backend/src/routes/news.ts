import { Router } from "express";
import { getDailyJapaneseNews, logDailyNewsPreview } from "../services/newsService.js";
import { prisma } from "../prisma.js";

const r = Router();

// GET /news/preview - fetch latest items and log to console
r.get("/preview", async (_req, res, next) => {
	try {
		const items = await getDailyJapaneseNews();
		// also output to console as the first step requirement
		await logDailyNewsPreview();
		res.json({ count: items.length, items, timestamp: new Date().toISOString() });
	} catch (e) {
		next(e);
	}
});

// GET /news?date=YYYY-MM-DD - fetch news items by date from database
r.get("/", async (req, res, next) => {
	try {
		const dateParam = req.query.date as string | undefined;
		
		let targetDate: Date;
		if (dateParam) {
			// Parse the date string (YYYY-MM-DD format)
			targetDate = new Date(dateParam);
			if (isNaN(targetDate.getTime())) {
				return res.status(400).json({ error: "無効な日付形式です。YYYY-MM-DD形式を使用してください" });
			}
		} else {
			// If no date provided, use today's date
			targetDate = new Date();
		}

		// Set to start and end of the day in Asia/Tokyo timezone
		const startOfDay = new Date(targetDate);
		startOfDay.setHours(0, 0, 0, 0);
		
		const endOfDay = new Date(targetDate);
		endOfDay.setHours(23, 59, 59, 999);

		const items = await prisma.newsItem.findMany({
			where: {
				newsDate: {
					gte: startOfDay,
					lte: endOfDay,
				},
			},
			orderBy: {
				pubDate: 'desc',
			},
		});

		res.json({ 
			date: dateParam || targetDate.toISOString().split('T')[0],
			count: items.length, 
			items: items.map(item => ({
				category: item.category,
				title: item.title,
				description: item.description,
				link: item.link,
				pubDate: item.pubDate?.toISOString(),
				source: item.source,
				newsDate: item.newsDate.toISOString(),
			}))
		});
	} catch (e) {
		next(e);
	}
});

export default r;


