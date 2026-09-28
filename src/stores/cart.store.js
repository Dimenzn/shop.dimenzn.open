import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from 'src/utils/api'
import { i18nInstance } from 'boot/i18n'

// ⚠️ Note: We import stores INSIDE actions/getters to avoid circular dependency issues
import { useAuthStore } from './auth.store'
import { usePRStore } from './products.store'
import { useUIStore } from './ui.store' // 🌟 NEW: Needed to fetch the platform fee rules

export const useCartStore = defineStore('cart', () => {
  // ----------------------------------------------------------------
  // 1. STATE
  // ----------------------------------------------------------------
  const cart = ref({ items: [] })
  const guestCartId = ref(localStorage.getItem('guestCartId'))

  // Cache for product details (Title, Image, Price) to display in UI
  const cartProductDetails = ref([])

  // ----------------------------------------------------------------
  // 2. HELPERS (Internal)
  // ----------------------------------------------------------------

  const setGuestCartId = id => {
    if (id) {
      guestCartId.value = id
      localStorage.setItem('guestCartId', id)
    } else {
      guestCartId.value = null
      localStorage.removeItem('guestCartId')
    }
  }

  const loadCartDetails = async (forceUpdate = false) => {
    if (!cart.value?.items || cart.value.items.length === 0) return

    const productsStore = usePRStore()
    const idsToFetch = []

    cart.value.items.forEach(item => {
      const cached = cartProductDetails.value.find(p => p.id === item.productId)

      if (forceUpdate || !cached) {
        // 🌟 FIXED: If forceUpdate is true, DO NOT use the shallow homepage cache.
        // Force it to hit the database to get the deep shipping rules!
        if (!forceUpdate) {
          const inStore =
            productsStore.products?.find(p => p.id === item.productId) ||
            productsStore.productsMostPopular?.find(p => p.id === item.productId) ||
            productsStore.productsNewArrivals?.find(p => p.id === item.productId)

          if (inStore) {
            // Avoid pushing duplicates if it somehow runs twice
            if (!cartProductDetails.value.some(p => p.id === inStore.id)) {
              cartProductDetails.value.push(inStore)
            }
            return // Skip adding to idsToFetch
          }
        }

        idsToFetch.push(item.productId)
      }
    })

    if (idsToFetch.length > 0) {
      const uniqueIds = [...new Set(idsToFetch)]
      try {
        const freshProducts = await productsStore.fetchProductsByIds(uniqueIds)

        freshProducts.forEach(freshProduct => {
          const index = cartProductDetails.value.findIndex(p => p.id === freshProduct.id)
          if (index !== -1) {
            cartProductDetails.value[index] = freshProduct // Update existing with deep data
          } else {
            cartProductDetails.value.push(freshProduct)
          }
        })
      } catch (error) {
        console.error('Failed to load cart product details', error)
      }
    }
  }

  const handleCartError = error => {
    if (error.response?.status === 404) {
      console.warn('Cart not found on server. Resetting local state.')
      setGuestCartId(null)
      cart.value = { items: [] }
      cartProductDetails.value = []
    }
  }

  // ----------------------------------------------------------------
  // 3. GETTERS
  // ----------------------------------------------------------------

  const cartItemCount = computed(() => {
    if (!cart.value?.items) return 0
    return cart.value.items.reduce((acc, item) => acc + item.quantity, 0)
  })

  const detailedCart = computed(() => {
    const locale = i18nInstance.global.locale.value

    if (!cart.value?.items || !cartProductDetails.value.length) {
      return []
    }

    return cart.value.items
      .map(item => {
        const product = cartProductDetails.value.find(p => p.id === item.productId)
        if (!product) return null

        const productLocale =
          product.locales?.[locale] ||
          product.locales?.['en-US'] ||
          Object.values(product.locales || {})[0] ||
          {}

        let maxQuantity = 0
        if (item.size) {
          const sizeObj = product.sizes?.find(s => s.size === item.size)
          maxQuantity = sizeObj ? sizeObj.qty : 0
        } else {
          maxQuantity = product.quantity ?? 0
        }

        return {
          ...item,
          maxQuantity,
          product: {
            title: productLocale.title || 'Unknown Product',
            image: productLocale.images?.[0] || '',
            price: product.price || 0,
            discountPrice: product.discountPrice || 0,
            sellerId: product.sellerId || null,
            sellerData: product.sellerData || null
          }
        }
      })
      .filter(item => item !== null)
  })

  const cartTotal = computed(() => {
    if (!detailedCart.value.length) return 0

    return detailedCart.value.reduce((total, item) => {
      const hasDiscount =
        item.product.discountPrice > 0 && item.product.discountPrice < item.product.price
      const effectivePrice = hasDiscount ? item.product.discountPrice : item.product.price
      return total + effectivePrice * item.quantity
    }, 0)
  })

  // 🌟 NEW: Calculates the exact Platform Service fee based on the UI DB Rules
  const cartPlatformFee = computed(() => {
    const uiStore = useUIStore()
    const config = uiStore.ui[0] || {}

    const feeType = config.platformFeeType || 'percentage'

    if (feeType === 'flat') {
      const uniqueSellers = new Set()

      detailedCart.value.forEach(item => {
        const sellerKey = item.product.sellerId || 'platform'
        uniqueSellers.add(sellerKey)
      })

      const flatRate = config.platformFeeFlat || 0
      // 🌟 FIX: Round to prevent Stripe decimal crashes
      return Math.round(uniqueSellers.size * flatRate)
    } else {
      const percentage = config.platformFeePercentage || 0
      // 🌟 FIX: Round percentage calculations to the nearest whole number
      return Math.round(cartTotal.value * (percentage / 100))
    }
  })

  // 🌟 NEW: The Grand Total (Items + Platform Fee)
  const cartGrandTotal = computed(() => {
    return cartTotal.value + cartPlatformFee.value
  })

  // ----------------------------------------------------------------
  // 4. ACTIONS
  // ----------------------------------------------------------------

  const fetchCart = async () => {
    const authStore = useAuthStore()
    try {
      if (authStore.isAuthenticated) {
        const response = await api.post('/auth/cart/get')
        cart.value = response.data || { items: [] }
        setGuestCartId(null)
      } else if (guestCartId.value) {
        const response = await api.post('/open/cart/get', { cartId: guestCartId.value })
        cart.value = response.data || { items: [] }
      } else {
        cart.value = { items: [] }
      }
      await loadCartDetails()
    } catch (error) {
      handleCartError(error)
    }
  }

  const initGuestCart = async () => {
    if (guestCartId.value) {
      await fetchCart()
    }
  }

  const addToCart = async (productId, size) => {
    const authStore = useAuthStore()
    try {
      let response
      if (authStore.isAuthenticated) {
        response = await api.post('/auth/cart/add', { productId, size })
      } else {
        response = await api.post('/open/cart/add', {
          productId,
          size,
          cartId: guestCartId.value
        })
        if (!guestCartId.value && response.data._id) {
          setGuestCartId(response.data._id)
        }
      }
      cart.value = response.data
      await loadCartDetails()
    } catch (error) {
      console.error('Failed to add item to cart:', error)
      throw error
    }
  }

  const updateQuantity = async (productId, size, newQuantity) => {
    if (newQuantity < 1) return
    const authStore = useAuthStore()

    try {
      const payload = { productId, size, newQuantity }
      let response

      if (authStore.isAuthenticated) {
        response = await api.post('/auth/cart/update-qty', payload)
      } else {
        payload.cartId = guestCartId.value
        response = await api.post('/open/cart/update-qty', payload)
      }
      cart.value = response.data
    } catch (error) {
      console.error('Failed to update quantity:', error)
      throw error
    }
  }

  const removeItem = async (productId, size) => {
    const authStore = useAuthStore()
    try {
      const payload = { productId, size }
      let response

      if (authStore.isAuthenticated) {
        response = await api.post('/auth/cart/remove-item', payload)
      } else {
        payload.cartId = guestCartId.value
        response = await api.post('/open/cart/remove-item', payload)
      }
      cart.value = response.data
    } catch (error) {
      console.error('Failed to remove item:', error)
      throw error
    }
  }

  const mergeGuestCart = async () => {
    if (!guestCartId.value) return
    try {
      const response = await api.post('/auth/cart/merge', {
        guestCartId: guestCartId.value
      })
      cart.value = response.data
      setGuestCartId(null)
      await loadCartDetails()
    } catch (error) {
      handleCartError(error)
    }
  }

  const clearCart = () => {
    cart.value = { items: [] }
    cartProductDetails.value = []
    setGuestCartId(null)
  }

  const verifyCartStock = async () => {
    const authStore = useAuthStore()
    const locale = i18nInstance.global.locale.value
    try {
      if (authStore.isAuthenticated) {
        await api.post('/auth/cart/verify-stock', { locale })
      } else {
        await api.post('/open/cart/verify-stock', {
          locale,
          cartId: guestCartId.value
        })
      }
      return true
    } catch (error) {
      handleCartError(error)
      return false
    }
  }

  const createOrder = async orderPayload => {
    const authStore = useAuthStore()
    try {
      let response
      if (authStore.isAuthenticated) {
        response = await api.post('/auth/order/create', orderPayload)
      } else {
        response = await api.post('/open/order/create', orderPayload)
      }

      if (response.data && response.data.success && !response.data.isDraft) {
        if (!authStore.isAuthenticated) setGuestCartId(null)
        clearCart()
      }

      return response.data
    } catch (error) {
      console.error('Create Order Failed:', error)
      throw error
    }
  }

  return {
    cart,
    guestCartId,
    cartItemCount,
    detailedCart,
    cartTotal,
    cartPlatformFee, // 🌟 EXPOSED TO UI
    cartGrandTotal, // 🌟 EXPOSED TO UI
    initGuestCart,
    fetchCart,
    addToCart,
    updateQuantity,
    removeItem,
    mergeGuestCart,
    clearCart,
    verifyCartStock,
    createOrder,
    loadCartDetails
  }
})
