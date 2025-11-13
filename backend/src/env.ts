import "dotenv/config";

const must = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
};

export const ENV = {
  PORT: Number(process.env.PORT || 8080),
  DATABASE_URL: must(process.env.DATABASE_URL, "DATABASE_URL"),
  REDIS_URL: must(process.env.REDIS_URL, "REDIS_URL"),
  NEWSDATA_API_KEY: must(process.env.NEWSDATA_API_KEY, "NEWSDATA_API_KEY"),
  NEWS_INTEREST_KEYWORDS: (process.env.NEWS_INTEREST_KEYWORDS || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean),
  SUPABASE_JWKS_URL: must(process.env.SUPABASE_JWKS_URL, "SUPABASE_JWKS_URL"),
  SUPABASE_ISSUER: must(process.env.SUPABASE_ISSUER, "SUPABASE_ISSUER"),
  SUPABASE_AUDIENCE: must(process.env.SUPABASE_AUDIENCE, "SUPABASE_AUDIENCE"),
  OPENAI_API_KEY: must(process.env.OPENAI_API_KEY, "OPENAI_API_KEY"),
  // SMTP (optional - if absent, emails are skipped and output is logged)
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'Execuwell ニュース配信'
};
