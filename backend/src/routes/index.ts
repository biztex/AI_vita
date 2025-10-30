import express from "express";
import health from "./health.ts";
import chat from "./chat.ts";
import personality from "./personality.ts";
import admin from "./admin.ts";
import news from "./news.ts";

const router = express.Router();
router.use("/health", health);
router.use("/chat", chat);
router.use("/personality", personality);
router.use("/admin", admin);
router.use("/news", news);
export default router;
