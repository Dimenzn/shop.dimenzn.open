<template>
  <div class="mts-bottom-nav shadow-up-3 TopPickContainer">
    <q-btn flat stack dense no-caps color="primary" class="nav-btn" @click="toggleLeftDrawer">
      <q-icon name="menu" size="sm" />
      <span class="nav-label">{{ t('button.BTN_MENU') }}</span>
    </q-btn>

    <q-btn
      v-if="!authStore.isAuthenticated && isLangBar"
      flat
      stack
      dense
      no-caps
      color="primary"
      class="nav-btn"
    >
      <q-icon name="language" size="sm" />
      <span class="nav-label">{{ t('button.BTN_LANG') }}</span>

      <q-menu auto-close anchor="top middle" self="bottom middle" :offset="[0, 25]">
        <q-list style="min-width: 150px" dense>
          <q-item
            v-for="lang in availableLanguages"
            :key="lang.value"
            clickable
            v-close-popup
            @click="changeLanguage(lang.value)"
            :active="locale === lang.value"
            active-class="bg-blue-1 text-primary"
          >
            <q-item-section>
              <div>
                <q-avatar size="xs" rounded>
                  <img :src="lang.flagImage" />
                </q-avatar>
                <span class="text-caption q-px-sm">{{ lang.label }}</span>
              </div>
            </q-item-section>
          </q-item>
        </q-list>
      </q-menu>
    </q-btn>

    <q-btn
      v-else-if="authStore.isAuthenticated && authStore.isAdmin"
      flat
      stack
      dense
      no-caps
      color="primary"
      class="nav-btn"
      @click="router.push('/admin')"
    >
      <q-icon name="admin_panel_settings" size="sm" />
      <span class="nav-label">{{ t('button.BTN_ADMIN') }}</span>
    </q-btn>

    <q-btn
      v-else
      :disable="!authStore.isAuthenticated"
      flat
      stack
      dense
      no-caps
      color="primary"
      class="nav-btn"
      @click="showComingSoon"
    >
      <q-icon name="storefront" size="sm" />
      <span class="nav-label">{{ t('button.BTN_PANEL') }}</span>
    </q-btn>

    <div class="nav-center-wrapper">
      <div class="nav-center-background">
        <q-btn size="lg" round color="primary" icon="home" @click="handleHomeClick()" />
      </div>
    </div>

    <q-btn flat stack dense no-caps color="primary" class="nav-btn" @click="router.push('/cart')">
      <div class="relative-position">
        <q-icon name="shopping_cart" size="sm" />
        <q-badge
          v-if="cartItemCount > 0"
          floating
          :label="cartItemCount"
          class="cart-badge"
          :class="{ 'badge-pop': animateBadge }"
        />
      </div>
      <span class="nav-label">{{ t('button.BTN_CART') }}</span>
    </q-btn>

    <q-btn
      v-if="authStore.isAuthenticated"
      flat
      stack
      dense
      no-caps
      color="primary"
      class="nav-btn"
      @click="router.push('/profile')"
    >
      <q-icon name="account_circle" size="sm" />
      <span class="nav-label">{{ t('button.BTN_PROFILE') }}</span>
    </q-btn>

    <q-btn
      v-else
      flat
      stack
      dense
      no-caps
      color="primary"
      class="nav-btn"
      @click="handleLoginClick()"
    >
      <q-icon name="login" size="sm" />
      <span class="nav-label">{{ loginButtonLabel }}</span>
    </q-btn>
    <q-dialog
      v-model="showUpgradeDialog"
      persistent
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      <q-card
        class="text-center q-pa-lg relative-position"
        style="border-radius: 16px"
        :style="[{ width: '420px', maxWidth: '90vw' }, offsetStyle]"
      >
        <q-btn
          icon="close"
          flat
          round
          dense
          v-close-popup
          class="absolute-top-right q-ma-sm text-grey-5 hover-text-primary"
          :disable="isUpgrading"
          style="z-index: 10"
        />

        <div class="q-mb-md q-mt-sm">
          <q-avatar
            size="80px"
            color="primary"
            text-color="white"
            icon="storefront"
            class="shadow-3"
          />
        </div>

        <div class="text-h5 text-weight-bold q-mb-xs">
          {{ t('title.UPGRADE_TITLE', 'Become a Seller') }}
        </div>

        <div class="text-grey-7 q-mb-lg">
          {{
            t(
              'label.UPGRADE_DESC',
              'Unlock the Seller Panel and start building your dream store today.'
            )
          }}
        </div>

        <q-banner class="bg-blue-1 rounded-borders q-mb-lg text-left text-body2">
          <template v-slot:avatar>
            <q-icon name="vpn_key" color="primary" />
          </template>
          {{
            t(
              'label.UPGRADE_HINT',
              'Please enter your 14-character activation key below to upgrade your account.'
            )
          }}
        </q-banner>

        <q-input
          v-model="activationKey"
          outlined
          class="q-mb-md"
          :label="t('label.UPGRADE_INPUT', 'Activation Key')"
          mask="XXXX-XXXX-XXXX"
          hint="Format: SELL-XXXX-XXXX"
          :error="!!keyError"
          :error-message="keyError"
          @update:model-value="keyError = ''"
          @keyup.enter="submitActivationKey"
          :disable="isUpgrading"
          input-class="text-center text-weight-bold text-h6 text-primary"
          input-style="letter-spacing: 3px; font-family: monospace;"
          spellcheck="false"
        >
        </q-input>

        <q-btn
          unelevated
          rounded
          color="primary"
          class="full-width q-py-sm text-weight-bold q-mb-md"
          :loading="isUpgrading"
          @click="submitActivationKey"
        >
          {{ t('button.BTN_UPGRADE', 'Upgrade Account') }}
          <template v-slot:loading>
            <q-spinner-dots class="on-left" />
            {{ t('label.VALIDATING', 'Validating...') }}
          </template>
        </q-btn>

        <div class="row justify-center items-center text-caption text-grey-8 q-mt-sm">
          <span
            class="cursor-pointer text-weight-medium q-pa-sm rounded-borders"
            style="transition: all 0.3s ease"
            :class="{ 'text-primary bg-blue-1': false }"
            @click="goToDigitalCheckout"
          >
            {{ t('button.BTN_BUY_KEY', 'Need a key? Get one here') }}
          </span>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
  // --- Vue & Core Imports ---
  import { computed, ref, watch, inject } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { storeToRefs } from 'pinia'
  import { useDialogOffset } from 'src/composables/useDialogOffset'
  import { useQuasar } from 'quasar'

  // --- Store Imports ---
  import { useNotifyStore } from 'src/stores/notify.store'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useUIStore } from 'src/stores/ui.store'
  import { useLAStore } from 'src/stores/languages.store'
  import { useCartStore } from 'src/stores/cart.store'
  import { useCAStore } from 'src/stores/categories.store'
  import { usePRStore } from 'src/stores/products.store'
  import { useADStore } from 'src/stores/ads.store'

  // --- Initialization ---
  const $q = useQuasar()
  const notifyStore = useNotifyStore()
  const router = useRouter()
  const route = useRoute()
  const { locale, t } = useI18n({ useScope: 'global' })
  const scrollController = inject('scrollController', null)

  const authStore = useAuthStore()
  const uiStore = useUIStore()
  const languageStore = useLAStore()
  const cartStore = useCartStore()
  const categoryStore = useCAStore()
  const productStore = usePRStore()
  const adStore = useADStore()

  // --- State ---
  const { cartItemCount } = storeToRefs(cartStore)
  const animateBadge = ref(false)
  const showUpgradeDialog = ref(false)
  const activationKey = ref('')
  const keyError = ref('')
  const isUpgrading = ref(false)

  // --- Computed Properties ---
  //const companyLogo = computed(() => uiStore.ui[0]?.urlImageCompanyLogo || '')
  const isLangBar = computed(() => uiStore.ui[0]?.langBar || false)
  const { offsetStyle } = useDialogOffset(computed(() => uiStore.ui[0]?.leftDrawerOpen || false))

  const availableLanguages = computed(() => {
    if (!languageStore.langs || !Array.isArray(languageStore.langs)) {
      return []
    }
    return languageStore.langs
      .filter(lang => lang.selected === true)
      .map(lang => ({
        label: lang.label || lang.value || '',
        value: lang.value,
        flagImage: lang.flagImage
      }))
  })

  const loginButtonLabel = computed(() => {
    const onAuthPage = route.name === 'login' || route.name === 'register'
    return onAuthPage ? t('button.BTN_BACK') : t('button.BTN_LOGIN')
  })

  // --- Watchers ---
  watch(cartItemCount, (newVal, oldVal) => {
    if (newVal > (oldVal || 0)) {
      animateBadge.value = true
      setTimeout(() => {
        animateBadge.value = false
      }, 300)
    }
  })

  // 🌟 NEW: The "Ghost Typist" Route Listener
  watch(
    () => route.query.autoUpgradeKey,
    newKey => {
      if (newKey) {
        // 1. Open the upgrade dialog
        showUpgradeDialog.value = true
        // 2. Visually insert the key into the input field
        activationKey.value = newKey
        keyError.value = ''

        // // 3. Add a 1.5-second dramatic pause so the user actually sees it happen
        // setTimeout(() => {
        //   submitActivationKey()

        //   // 4. Clean up the URL so it doesn't fire again if they refresh the page
        //   const query = { ...route.query }
        //   delete query.autoUpgradeKey
        //   router.replace({ query })
        // }, 1500)
      }
    },
    { immediate: true } // Run immediately in case the page loaded with the query
  )

  // --- Methods ---
  // 🌟 NEW: Direct-to-Checkout Routing
  const goToDigitalCheckout = () => {
    // 1. Mobile App Policy Guard (Matches ProductScope.vue logic)
    if ($q.platform.is.capacitor) {
      notifyStore.notify(
        403,
        t(
          'msgSystem.ERR_BUY_DIGITAL_WEB_ONLY',
          'Digital Keys can only be purchased on our website at dimenzn.com due to mobile app policies.'
        )
      )
      return
    }

    // 2. Close the dialog
    showUpgradeDialog.value = false

    // 3. Send them straight to the digital checkout using our "Friendly SKU"
    // Note: You must ensure this product is created in the Admin Panel with this exact ID!
    router.push({ name: 'checkout-digital', params: { id: 'platform-seller-key' } })
  }

  const handleHomeClick = () => {
    if (route.path === '/') {
      if (scrollController) {
        scrollController.scrollToTop()
      }
    } else {
      router.push('/')
    }
  }

  function showComingSoon() {
    if (authStore.isAuthenticated) {
      if (authStore.isSeller) {
        router.push('/panel')
      } else {
        showUpgradeDialog.value = true
        activationKey.value = ''
        keyError.value = ''
      }
    } else {
      notifyStore.notify(200, 'msgSystem.COMING_SOON')
    }
  }

  const submitActivationKey = async () => {
    if (!activationKey.value.trim()) {
      keyError.value = t('label.KEY_REQUIRED', 'Please enter a key.')
      return
    }

    isUpgrading.value = true
    keyError.value = ''

    // 🌟 Call the clean Pinia store action
    const result = await authStore.upgradeToSeller(activationKey.value.trim())

    if (result.success) {
      // It worked! Close dialog, notify, and redirect.
      showUpgradeDialog.value = false
      router.push('/panel')
    } else {
      // It failed! Map the backend error code to a translated string
      if (result.error === 'KEY_INVALID') {
        keyError.value = t('label.KEY_INVALID', 'Invalid key.')
      } else if (result.error === 'KEY_ALREADY_USED') {
        keyError.value = t('label.KEY_USED', 'This key has already been used.')
      } else {
        keyError.value = t('label.UPGRADE_FAILED', 'Failed to upgrade. Please try again.')
      }
    }

    isUpgrading.value = false
  }

  function toggleLeftDrawer() {
    if (uiStore.ui[0]) {
      uiStore.ui[0].leftDrawerOpen = !uiStore.ui[0].leftDrawerOpen
    }
  }

  async function changeLanguage(newLocale) {
    if (locale.value === newLocale) return

    const isValid = availableLanguages.value.some(l => l.value === newLocale)
    if (!isValid) {
      console.warn(`Toolbar: Invalid locale: ${newLocale}`)
      return
    }

    // 1. Instantly update the Vue UI
    locale.value = newLocale
    localStorage.setItem('user-locale', newLocale)

    try {
      // 2. Refresh necessary backend data based on the current route
      const promises = [categoryStore.fetchCategories(), uiStore.fetchUI(), adStore.fetchAds()]

      if (route.path === '/') {
        promises.push(productStore.fetchHomeProducts(newLocale))
      } else if (route.name === 'category' || route.name === 'search') {
        promises.push(productStore.fetchProducts({ ...route.query, locale: newLocale }))
      } else if (route.name === 'product' && route.params.id) {
        promises.push(productStore.fetchProductById(route.params.id, newLocale))
      }

      await Promise.all(promises)
    } catch (err) {
      console.error('Failed to refresh data after language switch', err)
    }
  }

  function handleLoginClick() {
    const onAuthPage = route.name === 'login' || route.name === 'register'
    if (onAuthPage) {
      router.push('/')
    } else {
      router.push({ name: 'login' })
    }
  }
</script>

<style lang="scss" scoped>
  /* Bottom Navigation Bar Container */
  .mts-bottom-nav {
    position: absolute;
    bottom: 8px;
    left: 0;
    width: 100%;
    height: 70px;
    background-color: white;
    border-radius: 0 0 24px 24px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    z-index: 2000;
    padding: 0 10px;
  }

  /* Individual Navigation Buttons */
  .nav-btn {
    min-width: 60px;
    flex: 1;
  }

  .nav-label {
    font-size: 11px;
    margin-top: 4px;
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  /* Center Floating Button CSS */
  .nav-center-wrapper {
    position: relative;
    width: 80px;
    height: 100%;
    display: flex;
    justify-content: center;
    flex: 1;
  }

  .nav-center-background {
    position: absolute;
    top: -25px;
    background: #ffffff;
    border-radius: 50%;
    padding: 6px;
  }

  .floating-home-btn {
    width: 64px;
    height: 64px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15) !important;
  }

  /* Cart Badge Animations */
  .cart-badge {
    background-color: orange;
    color: black;
    transition: transform 0.2s;
    top: -8px;
    right: -12px;
  }

  @keyframes pop {
    0% {
      transform: scale(1);
      background-color: orange;
      color: black;
    }
    50% {
      transform: scale(1.6);
      background-color: #21ba45;
      color: white;
    }
    100% {
      transform: scale(1);
      background-color: orange;
      color: black;
    }
  }

  .badge-pop {
    animation: pop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  }
</style>
