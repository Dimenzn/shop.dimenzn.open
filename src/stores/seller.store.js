import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from 'src/utils/api'

// 🌟 NEW: Import the admin store so we can check for God Mode
import { useAdminStore } from 'src/stores/admin.store'

export const useSellerStore = defineStore('seller', () => {
  // ==========================================
  // --- STATE: PUBLIC STOREFRONT ---
  // ==========================================
  const currentSellerProfile = ref(null)
  const isLoadingProfile = ref(false)
  let activeProfilePromise = null
  let lastFetchedSellerId = null

  // ==========================================
  // --- STATE: PRIVATE DASHBOARD ---
  // ==========================================
  const dashboardStats = ref({
    totalEarned: 0,
    pendingBalance: 0,
    itemsSold: 0,
    activeProducts: 0,
    platformFeesOwed: 0,
    trustScore: 1500, // Safe default
    stagnantOrdersCount: 0,
    leaderboard: []
  })
  const topProducts = ref([])
  const isLoadingDashboard = ref(false)
  const revenueChart = ref({ categories: [], data: [] })

  let activeDashboardPromise = null
  let isDashboardLoaded = false
  let lastTimeframe = '7d'

  // 🌟 NEW: Track who we last fetched so caching doesn't break when switching sellers
  let lastImpersonatedId = null

  // ==========================================
  // --- ACTIONS ---
  // ==========================================

  /**
   * Fetches the public storefront profile for a specific seller ID
   */
  const fetchSellerProfile = async (sellerId, forceReload = false) => {
    // 1. Cache Check
    if (!forceReload && currentSellerProfile.value && lastFetchedSellerId === sellerId) {
      return { success: true }
    }

    // 2. Deduplication Check
    if (activeProfilePromise && lastFetchedSellerId === sellerId) {
      return activeProfilePromise
    }

    // 3. Fetch and Lock
    isLoadingProfile.value = true
    currentSellerProfile.value = null
    lastFetchedSellerId = sellerId

    activeProfilePromise = (async () => {
      try {
        const response = await api.get(`/open/seller-profile/${sellerId}`)

        if (response.data.success) {
          currentSellerProfile.value = response.data.profile
          return { success: true }
        }
      } catch (error) {
        console.error('Store: Failed to load seller profile', error)
        return { success: false, status: error.response?.status }
      } finally {
        isLoadingProfile.value = false
        activeProfilePromise = null
      }
    })()

    return activeProfilePromise
  }

  /**
   * Fetches the private dashboard analytics for the logged-in seller (or Impersonated Seller)
   */
  const fetchDashboardData = async (timeframe = '30d', forceReload = false) => {
    // 🌟 Initialize Admin Store to check for God Mode
    const adminStore = useAdminStore()
    const currentTargetId = adminStore.impersonatedSellerId

    // 1. Cache Check
    // 🌟 UPDATE: Only use cache if Timeframe AND Target Seller are exactly the same
    if (
      !forceReload &&
      isDashboardLoaded &&
      lastTimeframe === timeframe &&
      lastImpersonatedId === currentTargetId
    ) {
      return { success: true }
    }

    // 2. Deduplication Check
    if (activeDashboardPromise) {
      return activeDashboardPromise
    }

    // 3. Fetch and Lock
    isLoadingDashboard.value = true

    activeDashboardPromise = (async () => {
      try {
        // Base URL
        let url = `/auth/seller/dashboard?timeframe=${timeframe}`

        // 🌟 THE FIX: Append targetSellerId if Admin is impersonating someone!
        if (currentTargetId) {
          url += `&targetSellerId=${currentTargetId}`
        }

        const response = await api.get(url)

        if (response.data.success) {
          dashboardStats.value = response.data.stats
          topProducts.value = response.data.topProducts
          revenueChart.value = response.data.revenueChart

          isDashboardLoaded = true
          lastTimeframe = timeframe
          lastImpersonatedId = currentTargetId // 🌟 Update cache tracker

          return { success: true }
        }
      } catch (error) {
        console.error('Store: Failed to load dashboard data', error)
        return { success: false }
      } finally {
        isLoadingDashboard.value = false
        activeDashboardPromise = null
      }
    })()

    return activeDashboardPromise
  }

  return {
    // Public State
    currentSellerProfile,
    isLoadingProfile,

    // Private State
    dashboardStats,
    topProducts,
    revenueChart,
    isLoadingDashboard,

    // Actions
    fetchSellerProfile,
    fetchDashboardData
  }
})
