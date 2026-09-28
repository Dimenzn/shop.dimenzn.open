import { defineRouter } from '#q-app/wrappers'
import {
  createRouter,
  createMemoryHistory,
  createWebHistory,
  createWebHashHistory
} from 'vue-router'
import routes from './routes'
import { useAuthStore } from 'src/stores/auth.store'

export default defineRouter(function () {
  const createHistory = process.env.SERVER
    ? createMemoryHistory
    : process.env.VUE_ROUTER_MODE === 'history'
      ? createWebHistory
      : createWebHashHistory

  const Router = createRouter({
    scrollBehavior: (to, from, savedPosition) => {
      if (savedPosition) return savedPosition
      if (to.hash) return { el: to.hash, behavior: 'smooth' }
      return { left: 0, top: 0 }
    },
    routes,
    history: createHistory(process.env.VUE_ROUTER_BASE)
  })

  // 🔒 THE GLOBAL GUARD
  Router.beforeEach(async to => {
    const authStore = useAuthStore()

    // 🌟 1. SYSTEM GATEKEEPER 🌟
    // Ensures we know the system state (Online/Install/etc) before proceeding
    if (!authStore.statusChecked || to.path === '/network-error') {
      await authStore.checkSystemStatus()
    }

    // 🌟 2. OFFLINE GUARD 🌟
    // If system is down, force user to Error Page
    if (authStore.isOffline) {
      if (to.path !== '/network-error') return '/network-error'
      return
    }

    // If we are ONLINE, but stuck on error page, go home
    if (!authStore.isOffline && to.path === '/network-error') {
      return '/'
    }

    // 🌟 3. STANDARD INSTALL ROUTING 🌟
    if (authStore.installMode) {
      if (to.path !== '/install') return '/install'
      return
    }

    // 🌟 3.5 FIRST ADMIN CHECK (The Fix!) 🌟
    // If the system is installed but has 0 users, force them to Register.
    if (authStore.noAdmin) {
      if (to.path !== '/register') return '/register'
      return
    }

    // Prevent access to installer if already installed
    if (!authStore.installMode && to.path === '/install') {
      return '/'
    }

    // 🌟 4. AUTHENTICATION LOGIC (The "Bouncer") 🌟

    // A. Always check token validity if one exists
    if (authStore.accessToken) {
      await authStore.initialize()
    }

    // B. UNIVERSAL LOGIN CHECK
    // 🌟 UPDATED: Now checks 'requiresPanelAccess' instead of 'requiresAdmin'
    if ((to.meta.requiresAuth || to.meta.requiresPanelAccess) && !authStore.accessToken) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    // C. GUEST ROUTE CHECK (Prevent logged-in users from seeing Login page)
    if (to.meta.requiresGuest && authStore.accessToken) {
      return '/'
    }

    // D. ROLE CHECK (The VIP Section)
    // 🌟 UPDATED: If they need Panel Access, but they are NEITHER an admin NOR a seller... kick them out!
    if (to.meta.requiresPanelAccess && !authStore.isAdmin && !authStore.isSeller) {
      return '/'
    }
  })

  return Router
})
