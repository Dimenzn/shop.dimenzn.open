import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from 'src/utils/api'

export const useADStore = defineStore('ad', () => {
  // --- STATE ---
  const adsBanner = ref([])

  // --- ACTIONS ---
  const fetchAds = async () => {
    try {
      const response = await api.post('/open/ads')
      adsBanner.value = response.data
    } catch (error) {
      console.error('Failed to load ads', error)
      throw error
    }
  }

  const createAd = async adData => {
    try {
      // 🚀 FIX: Corrected the malformed URL (removed double slash, added leading slash)
      const response = await api.post('/auth/admin/createAd', adData)

      // Instantly refresh the local state so the UI updates without a page reload
      await fetchAds()

      return response.data
    } catch (error) {
      console.error('Failed to create ad', error)
      throw error
    }
  }

  return {
    // State
    adsBanner,

    // Actions
    fetchAds,
    createAd
  }
})
