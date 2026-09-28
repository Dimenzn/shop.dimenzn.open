import cron from 'node-cron'
import Order from '../models/orderModel.js'
import User from '../models/userModel.js'
import UI from '../models/uiModel.js' // 🌟 NEW: Import UI settings

// ==========================================
// 🩸 THE BLEED: STAGNANT SHIPPING PUNISHMENT
// Runs every night at 00:00 (Midnight)
// ==========================================
export const initTrustScoreCron = () => {
  // 🌟 PRODUCTION CLOCK: Runs exactly at Midnight

  // 🛠️ DEV HACK: Run every 60 seconds
  // cron.schedule('* * * * *', async () => {
  // 🛠️ DEV HACK

  // *** REAL LIFE ***
  cron.schedule('0 0 * * *', async () => {
    // *** REAL LIFE ***

    console.log('🌑 [Cron] Midnight Sweep: Checking for stagnant shipments...')

    try {
      // 🌟 FETCH DYNAMIC RULES
      const uiConfig = (await UI.findOne()) || {}
      const stagnantDays = uiConfig.stagnantDays ?? 7
      const stagnantPenalty = uiConfig.stagnantPenalty ?? 10

      // Calculate the dynamic threshold

      // 🛠️ DEV HACK: Make Admin UI "Days" act like "Minutes"
      //const cutoffDate = new Date(Date.now() - stagnantDays * 60 * 1000)
      // 🛠️ DEV HACK

      // *** REAL LIFE ***
      const cutoffDate = new Date(Date.now() - stagnantDays * 24 * 60 * 60 * 1000)
      // *** REAL LIFE

      // Find all orders stuck that haven't been updated past the dynamic threshold
      const stagnantOrders = await Order.find({
        status: { $in: ['pending', 'confirmed', 'shipped'] },
        updatedAt: { $lt: cutoffDate }
      })

      if (stagnantOrders.length === 0) {
        console.log('✅ [Cron] All sellers are compliant. No stagnant orders found.')
        return
      }

      // Group the punishments by Seller so we only save each user once
      const sellerPunishments = {}

      for (const order of stagnantOrders) {
        // Assuming single-seller carts based on your architecture
        const sellerId = order.items[0]?.sellerId
        if (!sellerId) continue

        if (!sellerPunishments[sellerId]) {
          sellerPunishments[sellerId] = 0
        }

        // 🚨 Deduct dynamic penalty PER stagnant order
        sellerPunishments[sellerId] += stagnantPenalty
      }

      // Apply the punishments to the database
      for (const [sellerIdStr, penaltyAmount] of Object.entries(sellerPunishments)) {
        const seller = await User.findById(sellerIdStr)

        if (seller && seller.storeProfile) {
          const currentScore = seller.storeProfile.trustScore ?? 1500

          // Apply penalty, ensuring it never drops below 0 (The Hard Cap)
          seller.storeProfile.trustScore = Math.max(0, currentScore - penaltyAmount)

          await seller.save()
          console.log(
            `🩸 [Trust System] Seller ${seller.email || sellerIdStr} penalized -${penaltyAmount} SR for stagnant shipments!`
          )
        }
      }

      console.log(`🎯 [Cron] Sweep complete. ${stagnantOrders.length} stagnant orders penalized.`)
    } catch (error) {
      console.error('❌ [Cron] Error during Trust Score sweep:', error)
    }
  })
}
