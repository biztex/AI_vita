import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { ENV } from "./env.js";
import path from "path";
// import "./redis.js";
import router from "./routes/index.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { logDailyNewsPreview } from "./services/newsService.js";
import { startDailyNewsJob } from "./services/schedulerService.js";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// app.use(cors({ origin: true, credentials: true }));
const allowedOrigins = [
  'https://execuwell.jp',
  'https://www.execuwell.jp',
  'https://execuwell.jp/backend/',
  'https://www.execuwell.jp/backend/',
  'https://execuwell.jp/backend/',
  'http://210.131.214.112',
  'http://210.131.214.112:3000',
  'https://210.131.214.112:3000',
  'http://210.131.214.112/backend/',
  'https://210.131.214.112/backend/',
  'http://210.131.214.112/backend/',
];

app.use(cors({
  origin: function (origin: any, callback: any) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // only if you use cookies or tokens
}));

app.use('/uploads', express.static(path.resolve('upload')));

app.use(router);
app.use(errorHandler);

app.listen(ENV.PORT, async () => {
  console.log(`🚀 API running on http://localhost:${ENV.PORT}`);
  // Fetch and log news once at startup (first step)
  // try {
  //   await logDailyNewsPreview();
  // } catch (e) {
  //   console.error('Failed to run startup news preview:', e);
  // }
  // Start daily scheduler at 07:00 JST
  try {
    startDailyNewsJob();
    console.log('📅 Daily news job scheduled at 07:00 Asia/Tokyo');
  } catch (e) {
    console.error('Failed to start scheduler:', e);
  }
});
