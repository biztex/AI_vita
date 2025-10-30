import express from "express";
import { getDailyNews, logNewsToConsole } from "../services/newsService.js";

const router = express.Router();

router.get("/fetch", async (_req, res, next) => {
  try {
    const news = await getDailyNews();
    logNewsToConsole(news);
    res.json({ ok: true, news: {
      health: news.health,
      businessGlobal: news.businessGlobal,
      businessDomestic: news.businessDomestic,
    }});
  } catch (err) {
    next(err);
  }
});

export default router;


