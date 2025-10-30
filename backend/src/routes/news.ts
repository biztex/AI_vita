import express from "express";
import { getDailyNews, logNewsToConsole } from "../services/newsService.js";

const router = express.Router();

router.get("/fetch", async (_req, res, next) => {
  try {
    const news = await getDailyNews();
    logNewsToConsole(news);
    res.json({ ok: true, counts: {
      health: news.health.length,
      business: news.business.length,
      domestic: news.domestic.length,
      international: news.international.length,
    }});
  } catch (err) {
    next(err);
  }
});

export default router;


