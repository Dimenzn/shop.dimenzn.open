import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from 'src/utils/api'

export const useOrderStore = defineStore('order', () => {
  // --- STATE ---
  const currentOrder = ref(null)
  const orders = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // --- ACTIONS ---

  const fetchOrderById = async orderId => {
    if (!orderId) return

    isLoading.value = true
    error.value = null
    currentOrder.value = null

    try {
      const response = await api.get(`/open/order/${orderId}`)
      currentOrder.value = response.data
      return response.data
    } catch (err) {
      console.error('Failed to load order', err)
      error.value = err
      throw err // 🚀 FIX: Throw error so components can catch it consistently
    } finally {
      isLoading.value = false
    }
  }

  const fetchMyOrders = async () => {
    isLoading.value = true
    error.value = null

    try {
      // 🚀 FIX: Added the leading slash to ensure correct routing
      const response = await api.get('/auth/orders')

      // Handle both direct array and wrapped object responses
      if (Array.isArray(response.data)) {
        orders.value = response.data
      } else if (response.data && response.data.orders) {
        orders.value = response.data.orders
      } else {
        orders.value = [] // Safe fallback
      }

      return orders.value
    } catch (err) {
      console.error('Failed to load order history', err)
      error.value = err
      throw err // 🚀 FIX: Standardized error throwing
    } finally {
      isLoading.value = false
    }
  }

  const clearOrder = () => {
    currentOrder.value = null
    error.value = null
  }

  const clearHistory = () => {
    orders.value = []
  }

  // 🚀 Added a convenience function to wipe everything at once (useful for logout)
  const resetStore = () => {
    clearOrder()
    clearHistory()
  }

  return {
    // State
    currentOrder,
    orders,
    isLoading,
    error,

    // Actions
    fetchOrderById,
    fetchMyOrders,
    clearOrder,
    clearHistory,
    resetStore
  }
})
