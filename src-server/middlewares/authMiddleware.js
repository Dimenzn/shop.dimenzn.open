import jwt from 'jsonwebtoken'
import User from '../models/userModel.js'

// ==========================================
// 🛡️ INITIALIZATION GATEKEEPER
// ==========================================
/**
 * Prevents access to the installer/setup routes once the app is configured.
 */
export const verifyInitDatabase = async (req, res, next) => {
  try {
    // 1. Check if the connection string is still the placeholder
    if (process.env.MONGODB_URI === 'ConnectionString') {
      return res.status(403).json({ message: 'DB_MONGO_UNSET' })
    }

    // 2. Check if an admin or any user already exists
    const userExists = await User.exists({})
    if (userExists) {
      return res.status(403).json({ message: 'AUTH_UNAUTHORIZED' })
    }

    next()
  } catch (error) {
    console.error('❌ [Auth] Initialization check error:', error.message)
    res.status(500).json({ message: 'DB_INIT_ERR' })
  }
}

// ==========================================
// 🔑 TOKEN VERIFICATION
// ==========================================

/**
 * Validates the Access Token and ensures the user has ADMIN privileges.
 */
export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'AUTH_TOKEN_REQ' })

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)

    // Fetch only necessary fields: ID and Role
    const user = await User.findById(decoded.id).select('_id role')

    if (!user) {
      return res.status(401).json({ message: 'AUTH_TOKEN_INVALID' })
    }

    // FIX: Corrected boolean logic (user.role !== 'admin')
    if (user.role !== 'admin') {
      console.warn(`⚠️ [Auth] Unauthorized admin access attempt by: ${user._id}`)
      return res.status(403).json({ message: 'AUTH_CRED_INVALID' })
    }

    req.user = user
    next()
  } catch (error) {
    handleTokenError(res, error)
  }
}

/**
 * Validates the Access Token and ensures the user has SELLER privileges (or Admin/Platform).
 */
export const verifySellerToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'AUTH_TOKEN_REQ' })

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    const user = await User.findById(decoded.id).select('_id role')

    if (!user) {
      return res.status(401).json({ message: 'AUTH_TOKEN_INVALID' })
    }

    // 🌟 THE FIX: Allow 'seller', 'admin', and our new 'platform' role!
    if (!['seller', 'admin', 'platform'].includes(user.role)) {
      console.warn(`⚠️ [Auth] Unauthorized access attempt by: ${user._id} (Role: ${user.role})`)
      return res.status(403).json({ message: 'FORBIDDEN_SELLER_ONLY' })
    }

    req.user = user
    next()
  } catch (error) {
    handleTokenError(res, error)
  }
}

/**
 * Standard Access Token validation for members/authenticated users.
 */
export const verifyAccessToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.split(' ')[1]

    if (!token) return res.status(401).json({ message: 'AUTH_TOKEN_REQ' })

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    const user = await User.findById(decoded.id).select('_id role')

    if (!user) {
      return res.status(401).json({ message: 'AUTH_TOKEN_INVALID' })
    }

    req.user = user
    next()
  } catch (error) {
    handleTokenError(res, error)
  }
}

// ==========================================
// 🔄 TOKEN MANAGEMENT
// ==========================================

/**
 * Exchanges a valid Refresh Token for a brand new pair of tokens.
 * This is the primary way to keep a user logged in without asking for password.
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) return res.status(401).json({ message: 'AUTH_REFRESH_REQ' })

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(decoded.id)

    // Check if user exists and if the token matches what we have in DB
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ message: 'AUTH_REFRESH_INVALID' })
    }

    // Cycle tokens: Generate new ones and replace the old refresh token
    const newAccessToken = generateAccessToken(user._id)
    const newRefreshToken = generateRefreshToken(user._id)

    user.refreshToken = newRefreshToken
    await user.save()

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })
  } catch (error) {
    console.error('❌ [Auth] Refresh error:', error.message)
    res.status(403).json({ message: 'AUTH_REFRESH_INVALID' })
  }
}

// --- Utilities ---

export const generateAccessToken = userId => {
  return jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN
  })
}

export const generateRefreshToken = userId => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN
  })
}

/**
 * Centralized error handler for JWT exceptions.
 */
const handleTokenError = (res, error) => {
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'AUTH_TOKEN_EXPIRED' })
  }
  console.error('❌ [Auth] Token verification failed:', error.message)
  return res.status(403).json({ message: 'AUTH_TOKEN_INVALID' })
}
