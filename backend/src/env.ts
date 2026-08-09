import "dotenv/config";

const must = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
};

export const ENV = {
  PORT: Number(process.env.PORT || 8080),
  DATABASE_URL: must(process.env.DATABASE_URL, "postgresql://postgres:TempExecu2026!@db.yfeuvwztvzowensjamqn.supabase.co:5432/postgres"),
  NEWSDATA_API_KEY: must(process.env.NEWSDATA_API_KEY, "NEWSDATA_API_KEY"),
  NEWS_INTEREST_KEYWORDS: (process.env.NEWS_INTEREST_KEYWORDS || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean),
  SUPABASE_JWKS_URL: must(process.env.SUPABASE_JWKS_URL, "SUPABASE_JWKS_URL"),
  SUPABASE_ISSUER: must(process.env.SUPABASE_ISSUER, "SUPABASE_ISSUER"),
  SUPABASE_AUDIENCE: must(process.env.SUPABASE_AUDIENCE, "SUPABASE_AUDIENCE"),
  OPENAI_API_KEY: must(process.env.OPENAI_API_KEY, "OPENAI_API_KEY"),
  // AXEL conversation model — current OpenAI flagship (client's benchmark is
  // ChatGPT, which runs this generation; verified available on this API key
  // 2026-07-24). Also used by the LIFF web chat and the demo preview so every
  // client-facing surface shows the same quality tier.
  AXEL_MODEL: process.env.AXEL_MODEL || 'gpt-5.6-sol',
  // Budget-tier model of the same generation for the async understanding-update
  // pass — extraction accuracy here directly drives the "AXEL understands me"
  // feeling, so it tracks the current family rather than 2024's gpt-4o-mini.
  AXEL_UPDATER_MODEL: process.env.AXEL_UPDATER_MODEL || 'gpt-5.6-luna',
  // Reasoning effort for GPT-5-family calls. "low" is empirically as good as
  // "medium" for conversational work and markedly faster (LINE reply window).
  AXEL_REASONING_EFFORT: (process.env.AXEL_REASONING_EFFORT || 'low') as 'minimal' | 'low' | 'medium' | 'high',
  // Web search (client spec, 2026-08-04). 'on' enables the Responses-API
  // web_search pre-step for text turns; 'off' disables it (test harnesses set
  // this off to keep the chat.completions request path deterministic).
  AXEL_WEB_SEARCH: (process.env.AXEL_WEB_SEARCH || 'on') as 'on' | 'off',
  // Model for the web-search research pass (must support the web_search tool).
  AXEL_SEARCH_MODEL: process.env.AXEL_SEARCH_MODEL || 'gpt-5.6-sol',
  // SMTP (optional - if absent, emails are skipped and output is logged)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Execuwell ニュース配信',
  // Stripe
  STRIPE_SECRET_KEY: must(process.env.STRIPE_SECRET_KEY, "STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: must(process.env.STRIPE_WEBHOOK_SECRET, "STRIPE_WEBHOOK_SECRET"),
  STRIPE_PRICE_VITAAI: must(process.env.STRIPE_PRICE_VITAAI, "STRIPE_PRICE_VITAAI"),
  STRIPE_PRICE_EXECUWELL: must(process.env.STRIPE_PRICE_EXECUWELL, "STRIPE_PRICE_EXECUWELL"),
  STRIPE_PRICE_INTEGRATED: must(process.env.STRIPE_PRICE_INTEGRATED, "STRIPE_PRICE_INTEGRATED"),
  FRONTEND_URL: must(process.env.FRONTEND_URL, "FRONTEND_URL"),
  // LINE Messaging API
  LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET || '',
  LINE_CHANNEL_ACCESS_TOKEN: (process.env.LINE_CHANNEL_ACCESS_TOKEN || '').replace(/^"|"$/g, ''),
  // LINE Login (OAuth)
  LINE_LOGIN_CHANNEL_ID: process.env.LINE_LOGIN_CHANNEL_ID || '',
  LINE_LOGIN_CHANNEL_SECRET: process.env.LINE_LOGIN_CHANNEL_SECRET || '',
  LINE_LOGIN_CALLBACK_URL: process.env.LINE_LOGIN_CALLBACK_URL || '',
  // LIFF: ExecuWell 詳細ボタン・VitaAI 記録URLなど。複数 LIFF がある場合は PAGES 用 ID を優先。
  LIFF_ID: process.env.LIFF_ID || '',
  LIFF_ID_PAGES: process.env.LIFF_ID_PAGES || '',
};
