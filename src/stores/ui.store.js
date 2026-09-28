import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from 'src/utils/api'

// Assets
import logo from 'src/assets/dimenzn.png'

export const useUIStore = defineStore('ui', () => {
  // --- STATE ---
  const ui = ref([])
  let activeFetchPromise = null

  // --- ACTIONS ---

  // 🚀 FIX: Added `forceReload` so the Admin panel can force a fresh fetch after saving UI changes
  const fetchUI = async (forceReload = false) => {
    // 1. Cache Check
    if (!forceReload && ui.value && ui.value.length > 0) {
      return { data: ui.value }
    }

    // 2. Deduplication Check
    if (activeFetchPromise) {
      return activeFetchPromise
    }

    // 3. Fetch and Lock
    activeFetchPromise = (async () => {
      try {
        const response = await api.post('/open/ui')
        ui.value = response.data || []
        return response
      } catch (error) {
        console.error('Failed to load UI settings', error)
        ui.value = [] // Safe fallback to prevent computed property crashes
        throw error
      } finally {
        activeFetchPromise = null
      }
    })()

    return activeFetchPromise
  }

  // --- GETTERS ---

  const urlImageCompanyLogo = computed(() => {
    // 🚀 FIX: Streamlined nested if-statements into a single clean fallback.
    // Because an empty string ('') is falsy in JavaScript, the || operator handles it perfectly.
    return ui.value[0]?.urlImageCompanyLogo || logo
  })

  return {
    // State
    ui,

    // Getters
    urlImageCompanyLogo,

    // Actions
    fetchUI
  }
})
