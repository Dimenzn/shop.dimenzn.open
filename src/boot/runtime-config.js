import { boot } from 'quasar/wrappers'
import { api } from 'boot/axios' // Assuming you have axios boot file

// We'll export this so other files (like Stripe) can import it directly
export let marketConfig = {
  market: 'us',
  stripePublicKey: '',
  isInstalled: false,
  loaded: false
}

export default boot(async ({ app }) => {
  try {
    // 1. Call the new endpoint we're about to add to the backend
    // Since it's a relative path, it hits the port Nginx assigned (5000 or 5001)
    const response = await api.get('/open/config')

    // 2. Update our local config object
    marketConfig.market = response.data.market
    marketConfig.stripePublicKey = response.data.stripePublicKey
    marketConfig.isInstalled = response.data.isInstalled
    marketConfig.loaded = true

    // 3. Make it available in Vue components as this.$market
    app.config.globalProperties.$market = marketConfig

    console.log(`🌍 Market Identity Verified: ${marketConfig.market.toUpperCase()}`)
  } catch (error) {
    console.error('❌ Failed to fetch market configuration:', error)
  }
})
