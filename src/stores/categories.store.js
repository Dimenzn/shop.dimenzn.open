import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from 'src/utils/api'

export const useCAStore = defineStore('ca', () => {
  // --- STATE ---
  const categories = ref([])

  // Internal lock for request deduplication
  let activeFetchPromise = null

  // --- ACTIONS ---

  // 🚀 FIX: Added `forceReload` parameter to optionally bypass the cache
  const fetchCategories = async (forceReload = false) => {
    // 1. If we already have the data (and aren't forcing a refresh), skip the network request
    if (!forceReload && categories.value && categories.value.length > 0) {
      return { data: categories.value }
    }

    // 2. If a request is already in flight, share the Promise!
    if (activeFetchPromise) {
      return activeFetchPromise
    }

    // 3. Lock the door and start the request
    activeFetchPromise = (async () => {
      try {
        const response = await api.post('/open/categories')
        categories.value = response.data || []
        return response
      } catch (error) {
        console.error('Failed to load categories', error)
        throw error
      } finally {
        // 4. Always unlock the door when finished
        activeFetchPromise = null
      }
    })()

    return activeFetchPromise
  }

  const createCategory = async categoryData => {
    try {
      // 🚀 FIX: Added leading slash for safe routing
      const response = await api.post('/auth/admin/createCategory', categoryData)

      // 🚀 FIX: Pass `true` to force bypass the cache and fetch the new category!
      await fetchCategories(true)

      return response.data
    } catch (error) {
      console.error('Failed to create category', error)
      throw error
    }
  }

  return {
    // State
    categories,

    // Actions
    fetchCategories,
    createCategory
  }
})
