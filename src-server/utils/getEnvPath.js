import path from 'path'

export const getEnvPath = () => {
  // 1. Check for an explicit market flag, otherwise default to 'test' for local dev
  const market = process.env.MARKET_ENV || 'test'

  // 2. Always return the specific market file (e.g., .env.test, .env.rs, .env.th)
  // We NEVER return the global '.env' here, because we don't want envHelper overwriting our global keys!
  return path.resolve(process.cwd(), `.env.${market}`)
}
