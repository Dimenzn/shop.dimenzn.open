import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from 'src/utils/api'
import { i18nInstance } from 'boot/i18n'

export const usePRStore = defineStore('pr', () => {
  // --- STATE ---
  const products = ref([])
  const productsMostPopular = ref([])
  const productsNewArrivals = ref([])
  const productsPremium = ref([])
  const newestPaging = ref({ currentPage: 1, totalPages: 1 })

  const paging = ref({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0
  })

  const maxPriceLimit = ref(2000)

  // --- ACTIONS ---

  const fetchMaxPrice = async (category, locale) => {
    try {
      const loc = locale || i18nInstance.global.locale.value
      const response = await api.get('/open/products/stats', {
        params: { category, locale: loc }
      })
      maxPriceLimit.value = response.data.maxPrice
    } catch {
      maxPriceLimit.value = 2000
    }
  }

  const fetchHomeProducts = async (locale = null) => {
    try {
      const loc = locale || i18nInstance.global.locale.value
      const response = await api.get('/open/products', {
        params: {
          home: 'true',
          locale: loc
        }
      })

      productsMostPopular.value = response.data.popular || []
      productsNewArrivals.value = response.data.newest || []
      productsPremium.value = response.data.premium || []
      newestPaging.value = response.data.newestPagination || { currentPage: 1, totalPages: 1 }

      return response.data
    } catch (error) {
      console.error('Store: Failed to load home products', error)
      throw error
    }
  }

  const loadMoreNewArrivals = async () => {
    const nextPage = newestPaging.value.currentPage + 1

    // If we reached the end of the database, tell the UI to stop asking
    if (nextPage > newestPaging.value.totalPages) return false

    try {
      // Use Mode 2 to quickly fetch just the newest products!
      const response = await api.get('/open/products', {
        params: { sort: 'newest', limit: 18, page: nextPage }
      })

      // Append the new products to the existing array
      productsNewArrivals.value.push(...response.data.products)
      newestPaging.value.currentPage = response.data.currentPage

      return true // Let the UI know we successfully loaded more
    } catch (error) {
      console.error('Store: Failed to load more new arrivals', error)
      return false
    }
  }

  const fetchProducts = async (filters = {}, append = false) => {
    try {
      const currentLocale = filters.locale || i18nInstance.global.locale.value

      const response = await api.get('/open/products', {
        params: {
          limit: 20,
          ...filters,
          locale: currentLocale
        }
      })

      if (append) {
        products.value.push(...response.data.products)
      } else {
        products.value = response.data.products
      }

      paging.value = {
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        totalProducts: response.data.totalProducts
      }

      return response.data
    } catch (error) {
      console.error('Store: Failed to load shop products', error)
      throw error
    }
  }

  const fetchProductById = async (id, locale = null) => {
    try {
      const loc = locale || i18nInstance.global.locale.value
      const response = await api.get(`/open/product/${id}`, {
        params: { locale: loc }
      })
      return response.data
    } catch (error) {
      console.error(`Store: Failed to fetch product ${id}`, error)
      return null
    }
  }

  const fetchProductsByIds = async ids => {
    try {
      const response = await api.get('/open/products/batch', {
        params: { ids: ids.join(',') }
      })
      return response.data || []
    } catch (error) {
      console.error('Batch fetch failed', error)
      return []
    }
  }

  const createProduct = async productData => {
    try {
      const response = await api.post('/auth/admin/createProduct', productData)
      await fetchProducts()
      return response.data
    } catch (error) {
      console.error('Store: Failed to create product', error)
      throw error
    }
  }

  const rateProduct = async (productId, rating, comment) => {
    try {
      const response = await api.post('/auth/rate-product', { productId, rating, comment })
      const updatedProduct = response.data

      const updateList = listRef => {
        const index = listRef.value.findIndex(p => p.id == productId)
        if (index !== -1) {
          listRef.value[index] = updatedProduct
        }
      }

      updateList(products)
      updateList(productsMostPopular)
      updateList(productsNewArrivals)
      updateList(productsPremium) // 🌟 NEW: Keep premium products reactive to ratings!

      return updatedProduct
    } catch (error) {
      console.error('Store: Failed to rate product', error)
      throw error
    }
  }

  const registerView = async productId => {
    try {
      await api.post('/open/product/view', { productId })
    } catch (error) {
      console.error('Store: Failed to register view', error)
    }
  }

  return {
    // State
    products,
    productsMostPopular,
    productsNewArrivals,
    productsPremium,

    paging,
    maxPriceLimit,

    // Actions
    fetchHomeProducts,
    fetchProducts,
    fetchProductById,
    fetchProductsByIds,
    createProduct,
    rateProduct,
    registerView,
    fetchMaxPrice,
    loadMoreNewArrivals
  }
})
