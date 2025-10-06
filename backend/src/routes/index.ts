import express from "express";
import health from "./health.js";
import chat from "./chat.js";
import personality from "./personality.js";
import admin from "./admin.js";

const router = express.Router();
router.use("/health", health);
router.use("/chat", chat);
router.use("/personality", personality);
router.use("/admin", admin);
export default router;
