import { Router } from "express";
import { getDailyJapaneseNews, logDailyNewsPreview } from "../services/newsService.js";

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

export default r;


