import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from 'src/utils/api'
import { useI18n } from 'vue-i18n'
import { useLAStore } from 'src/stores/languages.store'
import { useAuthStore } from 'src/stores/auth.store'

export const useAdminStore = defineStore('admin', () => {
  const { t } = useI18n()
  const laStore = useLAStore()

  // --- STATE ---
  const activePanel = ref('')

  // 🌟 NEW: GOD MODE / IMPERSONATION STATE
  const impersonatedSellerId = ref(localStorage.getItem('impersonatedSellerId') || null)

  // Main Data
  const adminData = ref({
    languages: [],
    categories: [],
    products: [],
    newProducts: [],
    ads: [],
    ui: [],
    orders: []
  })

  // Pagination (Products)
  const productPaging = ref({
    page: 1,
    rowsPerPage: 10,
    rowsNumber: 0
  })

  // Pagination (Orders)
  const ordersPaging = ref({
    page: 1,
    rowsPerPage: 10,
    rowsNumber: 0
  })

  // --- DIRTY STATE TRACKING ---
  const modifiedIds = ref(new Set())
  const deletedIds = ref(new Set())
  const modifiedOrders = ref(new Set())
  const modifiedAds = ref(new Set())
  const modifiedCategories = ref(new Set())
  const modifiedLanguages = ref(new Set())
  const modifiedUI = ref(false)
  const modifiedTexts = ref(false)

  // =========================================================================
  // SECTION 1: FETCH ACTIONS
  // =========================================================================

  const fetchData = async () => {
    const authStore = useAuthStore()

    try {
      // ==========================================
      // 🟢 SELLER ROUTE
      // ==========================================
      if (authStore.isSeller) {
        const response = await api.get('/auth/seller/initData')

        adminData.value.languages = response.data.languages || []
        adminData.value.categories = response.data.categories || []
        return // Stop here, sellers are done!
      }

      // ==========================================
      // 🔴 ADMIN & PLATFORM ROUTE
      // ==========================================
      const response = await api.post('/auth/admin/getData')

      adminData.value.languages = response.data.languages || []
      adminData.value.categories = response.data.categories || []
      adminData.value.ads = response.data.ads || []
      adminData.value.ui = response.data.ui || []
    } catch (error) {
      console.error('Failed to load initial data', error)
    }
  }

  const fetchAdminProducts = async (props = {}) => {
    const authStore = useAuthStore()
    const { page = 1, limit = 10, search = '', sortBy = 'createdAt', order = 'desc' } = props

    const endpoint = authStore.isSeller ? '/auth/seller/products' : '/auth/admin/products'

    try {
      const response = await api.get(endpoint, {
        params: {
          page,
          limit,
          search,
          sortBy,
          order,
          targetSellerId: impersonatedSellerId.value // 🌟 PASS IMPERSONATION ID
        }
      })
      adminData.value.products = response.data.products
      productPaging.value = {
        page: response.data.currentPage,
        rowsPerPage: limit,
        rowsNumber: response.data.totalProducts
      }
    } catch (error) {
      console.error('Failed to load products', error)
    }
  }

  const fetchAdminOrders = async (props = {}) => {
    const authStore = useAuthStore()
    const { page = 1, limit = 10, search = '', statuses = [] } = props

    const endpoint = authStore.isSeller ? '/auth/seller/orders' : '/auth/admin/orders'

    try {
      const response = await api.get(endpoint, {
        params: {
          page,
          limit,
          search,
          statuses: statuses.join(','),
          targetSellerId: impersonatedSellerId.value // 🌟 PASS IMPERSONATION ID
        }
      })
      adminData.value.orders = response.data.orders
      ordersPaging.value = {
        page: response.data.currentPage,
        rowsPerPage: limit,
        rowsNumber: response.data.totalOrders
      }
    } catch (error) {
      console.error('Failed to fetch orders', error)
    }
  }

  // =========================================================================
  // SECTION 2: DIRTY STATE ACTIONS
  // =========================================================================
  // ... (No changes needed in Dirty State Actions)
  const markAsModified = id => {
    if (!deletedIds.value.has(id)) modifiedIds.value.add(id)
  }
  const toggleDelete = id => {
    if (deletedIds.value.has(id)) {
      deletedIds.value.delete(id)
    } else {
      deletedIds.value.add(id)
      modifiedIds.value.delete(id)
    }
  }
  const clearFlags = () => {
    modifiedIds.value.clear()
    deletedIds.value.clear()
  }

  const markOrderAsModified = id => modifiedOrders.value.add(id)
  const clearOrderFlags = () => modifiedOrders.value.clear()

  const markAdAsModified = id => modifiedAds.value.add(id)
  const clearAdFlags = () => modifiedAds.value.clear()

  const markCategoryAsModified = () => modifiedCategories.value.add('dirty')
  const clearCategoryFlags = () => modifiedCategories.value.clear()

  const markLanguageAsModified = () => modifiedLanguages.value.add('dirty')
  const clearLanguageFlags = () => modifiedLanguages.value.clear()

  const markUIAsModified = () => {
    modifiedUI.value = true
  }
  const clearUIFlags = () => {
    modifiedUI.value = false
  }

  const markTextsAsModified = () => {
    modifiedTexts.value = true
  }
  const clearTextFlags = () => {
    modifiedTexts.value = false
  }

  // =========================================================================
  // SECTION 3: SAVE LOGIC
  // =========================================================================

  const saveData = async (extraPayload = null) => {
    try {
      switch (activePanel.value) {
        case 'languages':
          await api.post('auth/admin/saveDataLanguages', adminData.value.languages)
          await laStore.fetchLanguages()
          clearLanguageFlags()
          break

        case 'texts':
          await api.post('auth/admin/saveDataLanguages', adminData.value.languages)
          await laStore.fetchLanguages()
          clearTextFlags()
          break

        case 'categories':
          await api.post('auth/admin/saveDataCategories', adminData.value.categories)
          clearCategoryFlags()
          break

        case 'products':
          return await _saveExistingProducts()

        case 'new products':
          return await _saveNewProducts()

        case 'ads':
          if (modifiedAds.value.size === 0) return
          await api.post('auth/admin/saveDataAds', adminData.value.ads)
          clearAdFlags()
          break

        case 'orders':
          return await _saveOrders()

        case 'setup': {
          const setupRequestBody = {
            uiData: adminData.value.ui,
            envPayload: extraPayload
          }

          const response = await api.post('auth/admin/saveDataUI', setupRequestBody)

          if (response.data && response.data.restarting) {
            const authStore = useAuthStore()
            await authStore.logout(true)
            window.location.href = '/login'
            return
          }

          clearUIFlags()
          break
        }

        default:
          console.warn('Unknown panel:', activePanel.value)
          return
      }

      if (!['products', 'new products', 'orders'].includes(activePanel.value)) {
        await fetchData()
      }
    } catch (error) {
      console.error('Save failed', error)
      throw error
    }
  }

  // --- INTERNAL SAVE HELPERS ---

  const _saveExistingProducts = async () => {
    if (modifiedIds.value.size === 0 && deletedIds.value.size === 0) return
    const authStore = useAuthStore()

    const payload = {
      updated: adminData.value.products.filter(p => modifiedIds.value.has(p.id)),
      deleted: Array.from(deletedIds.value)
    }

    const endpoint = authStore.isSeller
      ? 'auth/seller/saveBatchProducts'
      : 'auth/admin/saveBatchProducts'
    const response = await api.post(endpoint, payload)

    clearFlags()
    await fetchAdminProducts({ page: productPaging.value.page })
    return response.data
  }

  const _saveNewProducts = async () => {
    if (adminData.value.newProducts.length === 0) return
    const authStore = useAuthStore()

    const endpoint = authStore.isSeller
      ? 'auth/seller/createBatchProducts'
      : 'auth/admin/createBatchProducts'

    try {
      // 🌟 GOD MODE INJECTION: Map over the products and attach the seller ID
      const productsPayload = adminData.value.newProducts.map(product => {
        if (impersonatedSellerId.value) {
          // Forcefully assign to the God Mode seller
          return { ...product, sellerId: impersonatedSellerId.value }
        }
        return product
      })

      const response = await api.post(endpoint, {
        products: productsPayload // 🌟 Send the modified array!
      })

      if (response.data.success) {
        adminData.value.newProducts = []
        await fetchAdminProducts({ page: 1 })
        return response.data
      }
    } catch (error) {
      const msgKey = error.response?.data?.message || 'PROD_CREATE_ERR'
      let displayMsg = t('msgSystem.' + msgKey)
      if (displayMsg === 'msgSystem.' + msgKey) displayMsg = t(msgKey)
      throw error
    }
  }

  const _saveOrders = async () => {
    if (modifiedOrders.value.size === 0) return
    const authStore = useAuthStore()

    const payload = adminData.value.orders
      .filter(o => modifiedOrders.value.has(o._id))
      .map(o => ({ _id: o._id, status: o.status }))

    const endpoint = authStore.isSeller
      ? 'auth/seller/saveBatchOrders'
      : 'auth/admin/saveBatchOrders'
    const response = await api.post(endpoint, { orders: payload })

    clearOrderFlags()
    await fetchAdminOrders({
      page: ordersPaging.value.page,
      limit: ordersPaging.value.rowsPerPage
    })
    return response.data
  }

  // =========================================================================
  // SECTION 4: RESET & UTILS
  // =========================================================================

  const resetStore = () => {
    adminData.value = {
      languages: [],
      categories: [],
      products: [],
      newProducts: [],
      ads: [],
      ui: [],
      orders: []
    }
    productPaging.value = { page: 1, rowsPerPage: 10, rowsNumber: 0 }
    ordersPaging.value = { page: 1, rowsPerPage: 10, rowsNumber: 0 }

    modifiedIds.value.clear()
    deletedIds.value.clear()
    modifiedOrders.value.clear()
    modifiedAds.value.clear()
    modifiedCategories.value.clear()
    modifiedLanguages.value.clear()

    modifiedUI.value = false
    modifiedTexts.value = false
    activePanel.value = ''

    // 🌟 We DO NOT reset impersonatedSellerId here, because switching tabs resets the store!
  }

  const dropDatabase = async () => await api.post('auth/admin/dropData')
  const initDatabase = async () =>
    await api.post('/auth/admin/initDatabase', {}, { muteNotify: true })
  const seedDatabase = async () => await api.post('/auth/admin/seed')

  const setupLang = value => {
    const findLanguage = adminData.value.languages.find(lang => lang.value === value)
    if (findLanguage && findLanguage.selected && !findLanguage.i18n) {
      const USLanguage = adminData.value.languages.find(lang => lang.value === 'en-US')
      if (USLanguage) findLanguage.i18n = USLanguage.i18n
    }
  }

  return {
    adminData,
    activePanel,
    impersonatedSellerId, // 🌟 EXPORTED TO COMPONENTS
    productPaging,
    ordersPaging,
    modifiedIds,
    deletedIds,
    modifiedOrders,
    modifiedAds,
    modifiedCategories,
    modifiedLanguages,
    modifiedUI,
    modifiedTexts,
    fetchData,
    fetchAdminProducts,
    fetchAdminOrders,
    saveData,
    resetStore,
    initDatabase,
    dropDatabase,
    seedDatabase,
    setupLang,
    markAsModified,
    toggleDelete,
    clearFlags,
    markOrderAsModified,
    clearOrderFlags,
    markAdAsModified,
    clearAdFlags,
    markCategoryAsModified,
    clearCategoryFlags,
    markLanguageAsModified,
    clearLanguageFlags,
    markUIAsModified,
    clearUIFlags,
    markTextsAsModified,
    clearTextFlags
  }
})
