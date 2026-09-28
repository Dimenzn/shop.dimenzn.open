<template>
  <div>
    <transition appear enter-active-class="animated fadeIn" leave-active-class="animated fadeOut">
      <div
        v-if="!isAppReady"
        class="fullscreen window-height window-width bg-white flex flex-center fixed-top"
        style="z-index: 9999"
      >
        <div class="column items-center">
          <q-spinner-dots color="primary" size="80px" />
        </div>
      </div>
    </transition>

    <q-layout v-if="isDataReady" view="hHh LpR lFf">
      <div
        class="fixed-full bg-primary"
        style="opacity: 0.1; z-index: -1; pointer-events: none"
      ></div>

      <q-drawer
        v-if="uiStore.ui[0] && !$route.meta.requiresFullscreen"
        v-model="uiStore.ui[0].leftDrawerOpen"
        class="transparent-drawer no-border"
        persistent
      >
        <SidebarContainer />
      </q-drawer>

      <q-page-container>
        <router-view :key="$route.fullPath" />
      </q-page-container>

      <q-footer
        v-if="!$route.meta.requiresFullscreen"
        class="bg-transparent"
        style="height: 0px; overflow: visible"
      >
        <div
          style="
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 2000;
            pointer-events: none;
          "
        >
          <div class="row full-width justify-center q-px-sm">
            <div
              class="col-xs-12 col-xl-10"
              style="height: 100px; position: relative; pointer-events: auto"
            >
              <NavbarContainer />
            </div>
          </div>
        </div>
      </q-footer>
    </q-layout>
  </div>
</template>

<script setup>
  import { onBeforeMount, watch, watchEffect, ref, provide, nextTick } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useQuasar } from 'quasar'
  import { i18nInstance } from 'boot/i18n'

  // --- Components ---
  import SidebarContainer from 'src/components/sidebar/SidebarContainer.vue'
  import NavbarContainer from 'src/components/navbar/NavbarContainer.vue'

  // --- Stores ---
  import { useUIStore } from 'src/stores/ui.store'
  import { useLAStore } from 'src/stores/languages.store'
  import { useCAStore } from 'src/stores/categories.store'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useCartStore } from 'src/stores/cart.store'

  // --- Composables & State ---
  const $q = useQuasar()
  const router = useRouter()
  const route = useRoute()

  const uiStore = useUIStore()
  const laStore = useLAStore()
  const categoryStore = useCAStore()
  const authStore = useAuthStore()
  const cartStore = useCartStore()

  // 🌟 NEW: Split readiness states
  const isDataReady = ref(false)
  const isAppReady = ref(false)

  // ----------------------------------------------------------------
  // 🛞 SCROLL CONTROLLER (Bridge for Child Components)
  // ----------------------------------------------------------------
  const scrollHandler = ref(null)

  provide('scrollController', {
    register: scrollAreaRef => {
      scrollHandler.value = scrollAreaRef
    },
    scrollToTop: () => {
      if (scrollHandler.value) {
        scrollHandler.value.setScrollPosition('vertical', 0, 300)
      }
    }
  })

  // ----------------------------------------------------------------
  // 🔒 1. THE UNIVERSAL SECURITY MONITOR (Iron Dome)
  // ----------------------------------------------------------------
  watch(
    () => authStore.accessToken,
    newToken => {
      const isProtectedPage = route.meta.requiresAuth || route.meta.requiresPanelAccess

      if (newToken || !isProtectedPage) return

      console.warn('👋 Session ended. Redirecting to Login...')
      router.push({
        path: '/login',
        query: { redirect: route.fullPath }
      })
    }
  )

  // ----------------------------------------------------------------
  // 📢 2. GLOBAL NOTIFICATION SYSTEM SYNC
  // ----------------------------------------------------------------
  watchEffect(() => {
    const isDrawerOpen =
      uiStore.ui[0]?.leftDrawerOpen && !$q.screen.lt.md && !route.meta.requiresFullscreen

    if (isDrawerOpen) {
      document.body.classList.add('drawer-open-notify')
    } else {
      document.body.classList.remove('drawer-open-notify')
    }
  })

  // ----------------------------------------------------------------
  // 🖼️ 3. IMAGE PRELOADER LOGIC
  // ----------------------------------------------------------------
  const waitForImages = async () => {
    // Give Vue a tick to fully render the <router-view> into the DOM
    await nextTick()

    // Give a tiny extra buffer for nested v-for loops to attach their nodes
    await new Promise(resolve => setTimeout(resolve, 50))

    // Find every single <img> tag currently injected into the document
    const images = Array.from(document.querySelectorAll('img'))

    if (images.length === 0) return

    // Create an array of Promises that resolve when each image loads
    const imagePromises = images.map(img => {
      if (img.complete) return Promise.resolve() // Image is already cached

      return new Promise(resolve => {
        img.onload = resolve
        img.onerror = resolve // If an image 404s, resolve anyway so the app doesn't hang forever!
      })
    })

    await Promise.all(imagePromises)
  }

  // ----------------------------------------------------------------
  // 🌱 4. APP INITIALIZATION LOGIC
  // ----------------------------------------------------------------
  const initApp = async () => {
    try {
      // 1. Fetch core configuration simultaneously
      await Promise.all([
        laStore.fetchLanguages(),
        uiStore.fetchUI(),
        categoryStore.fetchCategories()
      ])

      // 🌟 NEW: MOBILE OVERRIDE
      // If the screen is mobile (less than 'md' breakpoint), force the drawer closed
      // on initial load so it doesn't block the main page!
      if (uiStore.ui[0] && $q.screen.lt.md) {
        uiStore.ui[0].leftDrawerOpen = false
      }

      // 2. Initialize Shopping Cart
      if (!authStore.accessToken) {
        await cartStore.initGuestCart()
      }

      // 3. Apply Languages
      laStore.initLocale(i18nInstance)
    } catch (error) {
      console.error('App: Initial Data Fetch failed:', error)
    } finally {
      // 🌟 PHASE 1 COMPLETE: Mount the DOM in the background!
      isDataReady.value = true

      // 🌟 PHASE 2: Wait for the images to load.
      // We use Promise.race as a safety net. If a user has a terrible internet connection,
      // we force the app to reveal itself after 2 seconds no matter what.
      await Promise.race([
        waitForImages(),
        new Promise(resolve => setTimeout(resolve, 2000)) // 2000ms safety timeout
      ])

      // 🌟 PHASE 2 COMPLETE: Drop the loading screen!
      isAppReady.value = true
    }
  }

  // 🛡️ RECOVERY WATCHER
  watch(
    () => authStore.isOffline,
    async isOffline => {
      if (!isOffline) {
        await initApp()
      }
    }
  )

  onBeforeMount(async () => {
    await initApp()
  })
</script>

<style lang="scss">
  aside.q-drawer,
  aside.q-drawer--left {
    background: transparent !important;
  }
</style>
