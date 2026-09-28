import User from '../models/userModel.js'

/**
 * Middleware to block restricted sellers from performing write actions.
 * Assumes verifyToken / verifySellerToken has already run and populated req.user.
 */
export const requireActiveBilling = async (req, res, next) => {
  try {
    // 1. We fetch the absolute latest user state from the database
    // (We don't rely on the JWT token payload, as their billing status might have changed 5 seconds ago)
    const user = await User.findById(req.user._id).select('storeProfile.billingStatus')

    if (!user) {
      return res.status(404).json({ message: 'USER_NOT_FOUND' })
    }

    // 2. Check the lock status
    if (user.storeProfile?.billingStatus === 'restricted') {
      console.warn(
        `🔒 [Billing Guard] Blocked restricted seller ${req.user._id} from accessing ${req.originalUrl}`
      )

      // 402 is the official HTTP status code for "Payment Required"
      return res.status(402).json({
        success: false,
        message: 'ERR_BILLING_RESTRICTED'
      })
    }

    // 3. If they are 'active' or just 'warning', let them through!
    next()
  } catch (error) {
    console.error('❌ [Billing Guard] Error:', error)
    res.status(500).json({ success: false, message: 'ERR_SERVER_ERROR' })
  }
}
