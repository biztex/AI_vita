import express from "express";
import health from "./health";
import chat from "./chat";
import personality from "./personality";
import admin from "./admin";
import news from "./news";
import auth from "./auth";
import profile from "./profile";
import stripe from "./stripe";

const router = express.Router();
router.get("/test", (_req, res) => {
  res.send("VitaAI/Execuwell api is running");
});
router.use("/health", health);
router.use("/auth", auth);
router.use("/chat", chat);
router.use("/personality", personality);
router.use("/admin", admin);
router.use("/news", news);
router.use("/profile", profile);
router.use("/stripe", stripe);
export default router;
