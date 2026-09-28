import rateLimit from 'express-rate-limit'

// ==========================================
// 🛡️ AUTHENTICATION RATE LIMITER
// ==========================================
/**
 * Prevents brute-force attacks on authentication routes (e.g., login, register).
 * Limits each IP to 5 requests per 15-minute window.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs

  // Standardize the response format to match the rest of the API
  message: { message: 'VAL_RATE_LIMIT' },

  // Intercept the block event to log it to the server console
  handler: (req, res, next, options) => {
    console.warn(`⚠️ [RateLimit] Brute-force blocked. Too many auth attempts from IP: ${req.ip}`)
    res.status(options.statusCode).json(options.message)
  }
})
