import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from 'src/utils/api'
import { jwtDecode } from 'jwt-decode'
import { useCartStore } from './cart.store'

import { useLAStore } from 'stores/languages.store'

export const useAuthStore = defineStore('auth', () => {
  // ----------------------------------------------------------------
  // 1. STATE
  // ----------------------------------------------------------------

  // System State
  const installMode = ref(false)
  const isOffline = ref(false)
  const registerMode = ref(false)
  const statusChecked = ref(false)
  const noAdmin = ref(false) // 👈 NEW: Router lock flag

  // User State
  const userProfile = ref(null)
  const accessToken = ref(localStorage.getItem('accessToken'))
  const refreshToken = ref(localStorage.getItem('refreshToken'))

  // External Stores
  const cartStore = useCartStore()
  const languagesStore = useLAStore()

  // ----------------------------------------------------------------
  // 2. GETTERS
  // ----------------------------------------------------------------

  const isAuthenticated = computed(() => !!userProfile.value?._id)
  const isAdmin = computed(() => userProfile.value?.role === 'admin')

  // 🌟 NEW: Dedicated platform check
  const isPlatform = computed(() => userProfile.value?.role === 'platform')

  // 🌟 MODIFIED: This now grants dashboard access to both Sellers AND the Platform!
  const isSeller = computed(() => ['seller', 'platform'].includes(userProfile.value?.role))

  // ----------------------------------------------------------------
  // 3. HELPERS (Internal)
  // ----------------------------------------------------------------

  const isAccessTokenExpired = () => {
    if (!accessToken.value) return true
    try {
      const decoded = jwtDecode(accessToken.value)
      return decoded.exp * 1000 < Date.now()
    } catch {
      console.warn('⚠️ Access Token malformed. Treating as expired.')
      return true
    }
  }

  const setTokens = data => {
    // Only save if the tokens actually exist in the payload
    if (data && data.accessToken && data.refreshToken) {
      accessToken.value = data.accessToken
      refreshToken.value = data.refreshToken
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('refreshToken', data.refreshToken)
    } else {
      // If no tokens are provided (e.g., during registration before verification), ensure it's clean
      accessToken.value = null
      refreshToken.value = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  const pollForInstallerMode = async () => {
    while (true) {
      try {
        console.log('Polling backend for reset signal...')
        const response = await api.post(`/open/languages?t=${Date.now()}`)

        if (Array.isArray(response.data) && response.data.length === 0) {
          return true
        }
        await new Promise(r => setTimeout(r, 1000))
      } catch (error) {
        if (error.response && error.response.status === 503) return true
        await new Promise(r => setTimeout(r, 1000))
      }
    }
  }

  // ----------------------------------------------------------------
  // 4. ACTIONS
  // ----------------------------------------------------------------

  // --- System Checks ---
  const checkSystemStatus = async () => {
    console.log('checkSystemStatus')

    // 🚀 NEW: Check for the Installer Breadcrumb
    if (localStorage.getItem('post_setup_redirect') === 'true') {
      noAdmin.value = true
    } else {
      noAdmin.value = false
    }

    if (statusChecked.value && !isOffline.value) return

    // Special Case: Reset Pending
    if (localStorage.getItem('system_reset_pending') === 'true') {
      installMode.value = await pollForInstallerMode()
      localStorage.removeItem('system_reset_pending')
      statusChecked.value = true
      isOffline.value = false
      return
    }

    // Standard Check
    try {
      const response = await languagesStore.fetchLanguages()
      isOffline.value = false

      // Zombie DB Check
      if (Array.isArray(response.data) && response.data.length === 0) {
        installMode.value = true
      } else {
        installMode.value = false
      }
    } catch (error) {
      if (error.response && error.response.status === 503) {
        const serverCode = error.response.data?.code || error.response.data?.error
        installMode.value = serverCode === 'SETUP_REQUIRED'
      } else {
        installMode.value = false
        isOffline.value = true
      }
    } finally {
      statusChecked.value = true
    }
  }

  // --- Core Auth Logic ---
  const verifyAccount = async token => {
    const response = await api.post('/auth/verify-email', { token })
    return response.data
  }

  const resendVerification = async payload => {
    const response = await api.post('/auth/resend-verification', payload)
    return response.data
  }

  const refreshAccessToken = async () => {
    const response = await api.post('/auth/refresh', {
      refreshToken: refreshToken.value
    })
    setTokens(response.data)
    return response.data
  }

  const forgotPassword = async payload => {
    const response = await api.post('/auth/forgot-password', payload)
    return response.data
  }

  const resetPassword = async payload => {
    const response = await api.post('/auth/reset-password', payload)
    return response.data
  }

  const logout = async (admin = false) => {
    const tokenToInvalidate = refreshToken.value

    // 1. 🌐 Hit the Backend FIRST (while we still have the token in memory)
    try {
      if (tokenToInvalidate && tokenToInvalidate !== 'undefined') {
        await api.post('/auth/logout', {
          refreshToken: tokenToInvalidate,
          admin: admin
        })
      }
    } catch (error) {
      console.warn('Server logout warning:', error.message)
    }

    // 2. 🧹 Scrub Persistent Storage
    // We remove the specific auth keys.
    // (Note: Use localStorage.clear() here instead if you want to wipe absolutely EVERYTHING,
    // but usually, it's better to keep UI preferences like dark mode or language intact).
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    sessionStorage.clear() // Always good to wipe session storage on logout

    // 3. ☢️ The "Nuclear" Store Reset
    // By forcing a hard redirect to the home page (or login page) instead of using
    // the Vue Router (router.push), we force the browser to completely destroy the
    // current Vue instance and all Pinia stores, guaranteeing zero data leakage.
    window.location.href = '/'
  }

  const initialize = async () => {
    if (!accessToken.value) return

    if (isAccessTokenExpired()) {
      if (!refreshToken.value) {
        await logout()
        return
      }

      try {
        await refreshAccessToken()
      } catch {
        await logout()
        return
      }
    }

    if (accessToken.value && !userProfile.value) {
      await fetchUserProfile()
    }

    if (userProfile.value) {
      await cartStore.fetchCart()
    }
  }

  const fetchUserProfile = async () => {
    try {
      const response = await api.post('/auth/profile')
      userProfile.value = response.data
    } catch {
      await logout()
    }
  }

  const updateUserProfile = async formData => {
    try {
      const response = await api.post('/auth/update-profile', formData)
      userProfile.value = response.data.userProfile
      return true
    } catch {
      return false
    }
  }

  // --- Auth Entry Points ---

  const login = async (credentials, silent = false) => {
    const response = await api.post('/auth/login', credentials, {
      _silent: silent
    })
    setTokens(response.data)
    await cartStore.mergeGuestCart()
    await initialize()
  }

  const register = async credentials => {
    const response = await api.post('/auth/register', credentials)
    setTokens(response.data)

    // 🚀 NEW: Unlock the Router!
    // We successfully registered, so we are no longer in "noAdmin" mode.
    localStorage.removeItem('post_setup_redirect')
    noAdmin.value = false

    await cartStore.mergeGuestCart()
    await initialize()

    // Special redirect logic for First-Time Admin
    if (userProfile.value?.role === 'admin') {
      return { success: true, redirectTo: '/admin', targetPanel: 'setup' }
    }
    return { success: true, redirectTo: '/' }
  }

  /**
   * Submits an activation key to upgrade the user to a seller.
   * Instantly updates the stored tokens and user profile on success.
   */
  const upgradeToSeller = async activationKey => {
    try {
      const response = await api.post('/auth/user/upgrade-role', {
        key: activationKey
      })

      if (response.data.success) {
        // 1. Instantly overwrite the old tokens in localStorage
        localStorage.setItem('accessToken', response.data.tokens.accessToken)
        localStorage.setItem('refreshToken', response.data.tokens.refreshToken)

        // 2. 🌟 MODIFIED: Instantly update Pinia state with the DYNAMIC role from the backend!
        if (userProfile.value && response.data.user?.role) {
          userProfile.value.role = response.data.user.role
        }

        // Return success to the component
        return { success: true }
      }
    } catch (error) {
      console.error('Store: Upgrade error:', error)
      const errorCode = error.response?.data?.message || 'UPGRADE_FAILED'
      return { success: false, error: errorCode }
    }
  }

  return {
    // State
    installMode,
    isOffline,
    registerMode,
    statusChecked,
    noAdmin, // 👈 NEW: Exported to Router Guard
    userProfile,
    accessToken,
    refreshToken,

    // Getters
    isAuthenticated,
    isAdmin,
    isSeller,
    isPlatform,

    // Actions
    checkSystemStatus,
    initialize,
    refreshAccessToken,
    login,
    register,
    logout,
    updateUserProfile,
    verifyAccount,
    resendVerification,
    forgotPassword,
    resetPassword,
    upgradeToSeller
  }
})
