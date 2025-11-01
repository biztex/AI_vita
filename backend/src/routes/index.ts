import express from "express";
import health from "./health";
import chat from "./chat";
import personality from "./personality";
import admin from "./admin";
import news from "./news";

const router = express.Router();
router.use("/health", health);
router.use("/chat", chat);
router.use("/personality", personality);
router.use("/admin", admin);
router.use("/news", news);
export default router;
