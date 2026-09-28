import User from '../models/userModel.js'
// ==========================================
// 🛑 SUSPENSION GUARD (THE DEADBOLT)
// ==========================================
/**
 * Prevents suspended sellers from accessing modifying routes.
 * Must be placed AFTER `verifySellerToken` so `req.user` exists.
 */
export const requireActiveAccount = async (req, res, next) => {
  try {
    // 1. Fetch the user's account status from the DB
    // (verifySellerToken only grabs _id and role to save memory, so we fetch the status here)
    const user = await User.findById(req.user._id).select('role storeProfile.accountStatus')

    if (!user) {
      return res.status(404).json({ message: 'AUTH_USER_NOT_FOUND' })
    }

    // 2. 🌟 GOD MODE EXEMPTION: Admins can always pass through
    if (user.role === 'admin') {
      return next()
    }

    // 3. 🛑 THE DEADBOLT: If they are suspended, reject the request immediately
    if (user.storeProfile?.accountStatus === 'suspended') {
      console.warn(`⚠️ [Security] Blocked API attempt by suspended seller: ${user._id}`)
      return res.status(403).json({ message: 'ACCOUNT_SUSPENDED_ERR' })
    }

    // 4. If active, let them through to the controller!
    next()
  } catch (error) {
    console.error('❌ [Auth] Suspension Guard Error:', error)
    res.status(500).json({ message: 'SERVER_ERROR' })
  }
}
