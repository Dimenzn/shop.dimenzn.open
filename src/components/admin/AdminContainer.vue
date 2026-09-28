<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: 97dvh; border-radius: 16px; overflow: hidden"
  >
    <div
      class="col-12 col-xl-10 full-width column no-wrap bg-white shadow-3"
      style="border-radius: 16px; overflow: hidden; height: 97dvh"
    >
      <div
        class="col-auto row justify-between items-center q-pa-md bg-grey-1"
        style="border-bottom: 1px solid #e0e0e0"
      >
        <div class="text-primary text-weight-bolder text-h6 row items-center q-gutter-sm">
          <span>{{ headerTitle }}</span>
          <q-badge
            color="secondary"
            outline
            align="middle"
            class="text-weight-bold"
            style="font-size: 0.75rem"
          >
            [ {{ locale }} ]
          </q-badge>

          <q-badge
            v-if="isImpersonating"
            color="negative"
            class="text-weight-bold shadow-1 q-ml-sm"
          >
            <q-icon name="visibility" size="xs" class="q-mr-xs" />
            GOD MODE
          </q-badge>
        </div>

        <div
          v-if="authStore.isAdmin || authStore.userProfile?._id"
          class="row full-width items-stretch justify-end q-pb-xs q-col-gutter-xs"
        >
          <div class="col-xs-6 col-sm-auto" :style="$q.screen.xs ? 'order: 1' : 'order: 1'">
            <q-btn
              size="sm"
              color="primary"
              unelevated
              outline
              icon="home"
              :label="$t('admin.BTN_EXIT', 'Exit')"
              @click="exitPanel"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>

          <div
            v-if="authStore.isAdmin"
            class="col-xs-12 col-sm-auto"
            :style="$q.screen.xs ? 'order: 5' : 'order: 2'"
          >
            <q-btn-dropdown
              size="sm"
              :color="isImpersonating ? 'negative' : 'primary'"
              :outline="!isImpersonating"
              :unelevated="isImpersonating"
              icon="supervisor_account"
              :label="impersonatedSellerName || $t('admin.BTN_VIEW_AS', 'View As: Admin')"
              class="full-width full-height rounded-borders text-weight-bold"
              :class="!isImpersonating ? 'bg-white' : ''"
            >
              <q-list style="min-width: 220px" dense>
                <q-item
                  clickable
                  v-close-popup
                  @click="clearImpersonation"
                  :active="!isImpersonating"
                  active-class="bg-blue-1 text-primary"
                >
                  <q-item-section avatar>
                    <q-icon
                      name="admin_panel_settings"
                      :color="!isImpersonating ? 'primary' : 'grey-7'"
                      size="sm"
                    />
                  </q-item-section>
                  <q-item-section class="text-weight-bold">
                    {{ $t('admin.LBL_DEFAULT_ADMIN', 'Admin (Default)') }}
                  </q-item-section>
                </q-item>

                <q-separator />

                <q-item-label header class="text-caption text-weight-bold q-pb-none">
                  {{ $t('admin.LBL_SELLERS', 'Sellers') }}
                </q-item-label>

                <q-item
                  v-for="seller in adminSellerList"
                  :key="seller.value"
                  clickable
                  v-close-popup
                  @click="impersonateSeller(seller)"
                  :active="adminStore.impersonatedSellerId === seller.value"
                  active-class="bg-red-1 text-negative"
                >
                  <q-item-section>
                    <q-item-label class="text-weight-bold">{{ seller.label }}</q-item-label>
                    <q-item-label caption class="ellipsis" style="max-width: 150px">{{
                      seller.email
                    }}</q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>

          <div class="col-xs-6 col-sm-auto" :style="$q.screen.xs ? 'order: 3' : 'order: 3'">
            <q-btn-dropdown
              v-if="authStore.isAdmin && !isImpersonating"
              size="sm"
              outline
              color="negative"
              icon="warning"
              class="full-width full-height bg-white rounded-borders"
              auto-close
            >
              <q-list style="min-width: 180px" dense>
                <q-item clickable @click="confirmSeed">
                  <q-item-section avatar>
                    <q-icon name="science" color="accent" size="sm" />
                  </q-item-section>
                  <q-item-section class="text-weight-bold text-accent">
                    {{ $t('admin.BTN_SEED_DB') }}
                  </q-item-section>
                </q-item>
                <q-separator />
                <q-item clickable @click="confirmDrop">
                  <q-item-section avatar>
                    <q-icon name="delete_forever" color="negative" size="sm" />
                  </q-item-section>
                  <q-item-section class="text-negative text-weight-bold">
                    {{ $t('admin.BTN_DROP_DB') }}
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>

            <q-btn
              v-else
              size="sm"
              color="primary"
              unelevated
              outline
              icon="storefront"
              :label="$t('seller.BTN_VIEW_STORE', 'View Store')"
              @click="goToStorefront"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>

          <div class="col-xs-6 col-sm-auto" :style="$q.screen.xs ? 'order: 4' : 'order: 4'">
            <q-btn-dropdown
              size="sm"
              color="primary"
              text-color="white"
              unelevated
              :label="locale"
              auto-close
              class="full-width full-height rounded-borders"
            >
              <q-list style="min-width: 150px" dense>
                <q-item
                  v-for="lang in availableLanguages"
                  :key="lang.value"
                  clickable
                  @click="changeLanguage(lang.value)"
                  :active="locale === lang.value"
                  active-class="bg-blue-1 text-primary"
                >
                  <q-item-section avatar>
                    <q-avatar size="xs" rounded>
                      <img :src="lang.flagImage" alt="flag" />
                    </q-avatar>
                  </q-item-section>
                  <q-item-section>
                    <span class="text-caption">{{ lang.label }}</span>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-btn-dropdown>
          </div>

          <div class="col-xs-6 col-sm-auto" :style="$q.screen.xs ? 'order: 2' : 'order: 5'">
            <q-btn
              size="sm"
              color="negative"
              unelevated
              icon="power_settings_new"
              :label="$t('button.BTN_LOGOUT')"
              @click="logout"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>

      <div class="col relative-position bg-white" style="min-height: 0">
        <MainPanel :key="adminStore.impersonatedSellerId || 'admin'" class="fit" />
      </div>
    </div>
  </div>
</template>

<script setup>
  // --- Imports ---
  import { computed, onMounted, onUnmounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { useQuasar } from 'quasar'
  import api from 'src/utils/api'

  // Components
  import MainPanel from 'src/components/admin/MainPanel.vue'

  // Stores
  import { useAuthStore } from 'src/stores/auth.store'
  import { useAdminStore } from 'src/stores/admin.store'
  import { useLAStore } from 'src/stores/languages.store'

  // --- Setup ---
  const { locale, t } = useI18n({ useScope: 'global' })
  const router = useRouter()
  const $q = useQuasar()
  const adminStore = useAdminStore()
  const laStore = useLAStore()
  const authStore = useAuthStore()

  // ==========================================
  // 🌟 IMPERSONATION / GOD MODE LOGIC
  // ==========================================
  const adminSellerList = ref([])
  const impersonatedSellerName = ref('')

  const isImpersonating = computed(() => {
    return authStore.isAdmin && !!adminStore.impersonatedSellerId
  })

  const loadAdminSellers = async () => {
    if (!authStore.isAdmin) return
    try {
      const response = await api.get('/auth/admin/users')
      const sellers = response.data.users.filter(u => u.role === 'seller')

      adminSellerList.value = sellers.map(s => ({
        label: s.storeProfile?.storeName || 'Unnamed Store',
        email: s.email,
        value: s._id
      }))

      // Restore session name if page reloaded
      if (adminStore.impersonatedSellerId) {
        const found = adminSellerList.value.find(s => s.value === adminStore.impersonatedSellerId)
        if (found) impersonatedSellerName.value = found.label
      }
    } catch (error) {
      console.error('Failed to load sellers for impersonation:', error)
    }
  }

  const impersonateSeller = seller => {
    impersonatedSellerName.value = seller.label
    adminStore.impersonatedSellerId = seller.value
    localStorage.setItem('impersonatedSellerId', seller.value)

    $q.notify({
      type: 'negative',
      message: `GOD MODE: Viewing as ${seller.label}`,
      icon: 'visibility',
      position: 'top'
    })
  }

  const clearImpersonation = () => {
    impersonatedSellerName.value = ''
    adminStore.impersonatedSellerId = null
    localStorage.removeItem('impersonatedSellerId')
  }

  // --- Computed ---
  const availableLanguages = computed(() => {
    if (!laStore.langs || !Array.isArray(laStore.langs)) return []
    return laStore.langs
      .filter(lang => lang.selected === true)
      .map(lang => ({
        label: lang.label || lang.value,
        value: lang.value,
        flagImage: lang.flagImage
      }))
  })

  const headerTitle = computed(() => {
    if (isImpersonating.value) {
      return `${t('admin.SELLER_TITLE', 'Seller Panel')} (${impersonatedSellerName.value})`
    }
    if (authStore.isAdmin) {
      return t('admin.PANEL_TITLE', 'Admin Panel')
    }

    const storeName = authStore.userProfile?.storeProfile?.storeName
    return storeName ? storeName : t('admin.SELLER_TITLE', 'Seller Panel')
  })

  // --- Methods ---
  const confirmSeed = () => {
    const CONFIRM_KEY = 'SEED'
    const warning = t('admin.MSG_SEED_WARN')
    const instruction = t('admin.MSG_TYPE_TO_CONFIRM', { key: `<b>${CONFIRM_KEY}</b>` })

    $q.dialog({
      title: `<span class="text-accent text-weight-bold">${t('admin.TIT_SEED_DB')}</span>`,
      message: `${warning}<br/>${instruction}`,
      html: true,
      prompt: {
        model: '',
        type: 'text',
        isValid: val => val === CONFIRM_KEY
      },
      cancel: true,
      persistent: true,
      ok: {
        label: t('admin.BTN_PROCEED'),
        color: 'accent'
      }
    }).onOk(async data => {
      if (data === CONFIRM_KEY) {
        $q.loading.show()
        try {
          await adminStore.seedDatabase()
        } catch (error) {
          console.error('Seed DB Error:', error)
        } finally {
          $q.loading.hide()
        }
      }
    })
  }

  const confirmDrop = () => {
    const CONFIRM_KEY = 'DROP'
    const warning = t('admin.MSG_DROP_WARN')
    const instruction = t('admin.MSG_TYPE_TO_CONFIRM', { key: `<b>${CONFIRM_KEY}</b>` })

    $q.dialog({
      title: `<span class="text-negative text-weight-bold">${t('admin.TIT_DANGER')}</span>`,
      message: `${warning}<br/>${instruction}`,
      html: true,
      prompt: {
        model: '',
        type: 'text',
        isValid: val => val === CONFIRM_KEY
      },
      cancel: true,
      persistent: true,
      ok: {
        label: t('admin.BTN_DELETE_ALL'),
        color: 'negative'
      }
    }).onOk(async data => {
      if (data === CONFIRM_KEY) {
        $q.loading.show({ message: 'Resetting System...' })

        try {
          localStorage.setItem('system_reset_pending', 'true')
          await adminStore.dropDatabase()
          setTimeout(() => {
            window.location.href = '/'
          }, 500)
        } catch (error) {
          console.error('Drop DB Error:', error)
          localStorage.removeItem('system_reset_pending')
          $q.loading.hide()
        }
      }
    })
  }

  const changeLanguage = async newLocale => {
    if (locale.value !== newLocale) {
      locale.value = newLocale
      localStorage.setItem('user-locale', newLocale)
      try {
        if (authStore.isAuthenticated) {
          await authStore.updateUserProfile({ locale: newLocale })
        }
      } catch (error) {
        console.error('Failed to save admin language preference:', error)
      }
    }
  }

  const goToStorefront = () => {
    // If impersonating, go to THAT seller's store!
    const targetId = isImpersonating.value
      ? adminStore.impersonatedSellerId
      : authStore.userProfile?._id
    if (targetId) {
      router.push(`/seller/${targetId}`)
    }
  }

  const exitPanel = () => {
    router.push({ name: 'home' })
  }

  const logout = async () => {
    clearImpersonation() // Clear God Mode on logout
    try {
      await authStore.logout()
    } catch (error) {
      console.error('AUTH_LOGOUT_ERR:', error)
    }
  }

  // --- Lifecycle ---
  onMounted(() => {
    // Restore impersonation from localStorage on hard reload
    const savedImpersonation = localStorage.getItem('impersonatedSellerId')
    if (authStore.isAdmin && savedImpersonation) {
      adminStore.impersonatedSellerId = savedImpersonation
    }
    loadAdminSellers()
  })

  onUnmounted(() => {
    adminStore.resetStore()
  })
</script>
