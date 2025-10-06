import express from "express";
import cors from "cors";
import { ENV } from "./env.js";
import "./redis.js";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));

app.use(router);
app.use(errorHandler);

app.listen(ENV.PORT, () => console.log(`🚀 API running on http://localhost:${ENV.PORT}`));
