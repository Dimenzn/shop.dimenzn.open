import axios from 'axios'
import { useAuthStore } from 'src/stores/auth.store'
import { useNotifyStore } from 'src/stores/notify.store'

// ----------------------------------------------------------------
// 1. Create Axios Instance
// ----------------------------------------------------------------
// If BASE_URL_API is injected (Port 9000 Dev Server), use absolute routing.
// If it is missing (Local Nginx Build OR Live Production Build), use relative '/api'.
const api = axios.create({
  baseURL: process.env.BASE_URL_API ? process.env.BASE_URL_API + '/api/' : '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

// ----------------------------------------------------------------
// 2. REQUEST INTERCEPTOR (The Outgoing Mail)
// ----------------------------------------------------------------
api.interceptors.request.use(
  config => {
    console.log('')
    console.log('api.interceptors.request:')
    console.log(config.url)
    console.log(config.data)
    // ⚠️ CRITICAL: Read from localStorage directly to avoid
    // accessing Pinia stores before the app fully mounts.
    const token = localStorage.getItem('accessToken')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  error => Promise.reject(error)
)

// ----------------------------------------------------------------
// 3. RESPONSE INTERCEPTOR (The Incoming Mail)
// ----------------------------------------------------------------
api.interceptors.response.use(
  // ✅ SUCCESS HANDLER (2xx)
  response => {
    console.log('')
    console.log('api.interceptors.response:')
    console.log(response.config.url)
    console.log(response.data)
    const notifyStore = useNotifyStore()

    // Notify if there is a specific system message (ignoring 'SILENT')
    if (response.data?.message && response.data.message !== 'SILENT') {
      notifyStore.notify(response.status, response.data.message)
    }

    return response
  },

  // ❌ ERROR HANDLER (4xx, 5xx)
  async error => {
    const originalRequest = error.config || {}
    const isSilent = originalRequest._silent || false

    // Instantiate stores safely inside the callback
    const notifyStore = useNotifyStore()
    const authStore = useAuthStore()

    // --- A. CRITICAL NETWORK FAILURE (Server Down) ---
    if (error.code === 'ERR_NETWORK' || !error.response) {
      if (window.location.pathname !== '/network-error') {
        console.warn('Backend unreachable. Hard redirecting to Network Error page...')
        window.location.href = '/network-error'
      }
      return Promise.reject(error)
    }

    // Check for Muted Notifications
    if (originalRequest.muteNotify) {
      return Promise.reject(error)
    }

    // --- B. UNAUTHORIZED (401) - AUTO TOKEN RECOVERY ---
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        console.log('🔄 Token expired. Attempting background refresh...')

        // 1. Ask AuthStore to swap the dead token for a fresh one
        await authStore.refreshAccessToken()

        // 2. Update the stalled request with the new token
        originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`

        // 3. Fire the request again transparently
        return api(originalRequest)
      } catch (refreshError) {
        // 🛑 REFRESH FAILED: The user's session is completely dead.
        console.warn('⛔ Session recovery failed. Wiping local data and logging out.')

        // Wipe all local states. The Router will automatically kick them to /login
        await authStore.logout()

        return Promise.reject(refreshError)
      }
    }

    // --- C. GENERIC API ERRORS (400, 403, 404, 500) ---
    const message = error.response.data?.message || 'GEN_ERR'

    // Don't pop up red banners for 401s (we already handled them) or explicitly silenced requests
    if (error.response.status !== 401 && message !== 'SILENT' && !isSilent) {
      notifyStore.notify(error.response.status, message)
    }

    return Promise.reject(error)
  }
)

export default api
