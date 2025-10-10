import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { ENV } from "./env.ts";
// import "./redis.js";
import router from "./routes/index.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(cors({ origin: true, credentials: true }));
// app.use(cors());
// app.use(cors({ origin: true, credentials: true }));
// app.use(express.json({ limit: "5mb" }));

// app.post("/chat", (req: any, res: any) => {
//   console.log(req.body);
//   res.json({ ok: true });
// });

app.use(router);
app.use(errorHandler);

app.listen(ENV.PORT, () => console.log(`🚀 API running on http://localhost:${ENV.PORT}`));
