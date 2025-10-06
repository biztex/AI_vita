import "dotenv/config";

const must = (v: string | undefined, name: string) => {
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
};

export const ENV = {
  PORT: Number(process.env.PORT || 8080),
  DATABASE_URL: must(process.env.DATABASE_URL, "DATABASE_URL"),
  REDIS_URL: must(process.env.REDIS_URL, "REDIS_URL"),
  SUPABASE_JWKS_URL: must(process.env.SUPABASE_JWKS_URL, "SUPABASE_JWKS_URL"),
  SUPABASE_ISSUER: must(process.env.SUPABASE_ISSUER, "SUPABASE_ISSUER"),
  SUPABASE_AUDIENCE: must(process.env.SUPABASE_AUDIENCE, "SUPABASE_AUDIENCE")
};
