<template>
  <div class="col column relative-position bg-white" style="overflow: hidden">
    <q-banner v-if="isSuspended" inline-actions class="bg-red-10 text-white border-bottom q-pa-md">
      <template v-slot:avatar>
        <q-icon name="block" color="white" size="lg" />
      </template>
      <div class="text-subtitle1 text-weight-bold">
        {{ $t('seller.SUSPENDED_TITLE', 'ACCOUNT SUSPENDED') }}
      </div>
      <div class="text-body2">
        {{
          $t(
            'seller.SUSPENDED_DESC',
            'Your store has been suspended by an Administrator due to a policy violation. Your public storefront is currently offline.'
          )
        }}
      </div>
    </q-banner>

    <q-banner v-else-if="isRestricted" inline-actions class="bg-red-2 text-negative border-bottom">
      <template v-slot:avatar>
        <q-icon name="gavel" color="negative" />
      </template>
      <strong>{{ $t('seller.BILLING_RESTRICTED_TITLE', 'Store Suspended:') }}</strong>
      {{
        lockReason
          ? $t(lockReason)
          : $t(
              'seller.BILLING_RESTRICTED_DESC',
              'Your store is offline. Please add a valid billing card to reactivate your listings.'
            )
      }}
    </q-banner>

    <q-banner
      v-else-if="showWarningBanner"
      inline-actions
      class="bg-orange-2 text-orange-9 border-bottom"
    >
      <template v-slot:avatar>
        <q-icon name="warning" color="orange-9" />
      </template>
      <strong>{{ $t('seller.BILLING_WARNING_TITLE', 'Action Required:') }}</strong>
      {{
        $t(
          'seller.BILLING_WARNING_DESC',
          'Please update your billing card soon to avoid store suspension.'
        )
      }}
    </q-banner>

    <q-splitter v-model="splitterModel" unit="px" disable class="col">
      <template v-slot:before>
        <div
          class="bg-grey-1 full-height q-py-md hide-native-scrollbar"
          style="border-right: 1px solid #f0f0f0; overflow-y: auto"
        >
          <q-tabs
            v-model="adminStore.activePanel"
            vertical
            class="text-grey-7"
            active-color="primary"
            active-bg-color="blue-1"
            indicator-color="transparent"
          >
            <q-tab
              name="dashboard"
              icon="dashboard"
              class="q-mx-sm q-mb-xs rounded-borders"
              :disable="isActionRestricted && !showAdminTabs"
            >
              <q-tooltip anchor="center right" self="center left" :offset="[10, 10]">
                {{
                  showAdminTabs
                    ? $t('admin.NAV_DASHBOARD', 'Overview')
                    : $t('seller.NAV_DASHBOARD', 'Dashboard')
                }}
              </q-tooltip>
            </q-tab>

            <q-tab name="orders" icon="shopping_bag" class="q-mx-sm q-mb-xs rounded-borders">
              <q-tooltip anchor="center right" self="center left" :offset="[10, 10]">
                {{ $t('admin.NAV_ORDERS') }}
              </q-tooltip>
            </q-tab>

            <q-tab
              name="products"
              icon="view_in_ar"
              class="q-mx-sm q-mb-xs rounded-borders"
              :disable="isActionRestricted && !showAdminTabs"
            >
              <q-tooltip anchor="center right" self="center left" :offset="[10, 10]">{{
                $t('admin.NAV_PRODS')
              }}</q-tooltip>
            </q-tab>

            <q-tab
              name="new products"
              icon="post_add"
              class="q-mx-sm q-mb-xs rounded-borders"
              :disable="isActionRestricted && !showAdminTabs"
            >
              <q-tooltip anchor="center right" self="center left" :offset="[10, 10]">{{
                $t('admin.NAV_NEW_PRODS')
              }}</q-tooltip>
            </q-tab>

            <q-separator v-if="showAdminTabs" class="q-my-sm q-mx-md" />

            <q-tab
              v-if="showAdminTabs"
              name="keys"
              icon="vpn_key"
              class="q-mx-sm q-mb-xs rounded-borders"
            />
            <q-tab
              v-if="showAdminTabs"
              name="ads"
              icon="campaign"
              class="q-mx-sm q-mb-xs rounded-borders"
            />
            <q-tab
              v-if="showAdminTabs"
              name="categories"
              icon="category"
              class="q-mx-sm q-mb-xs rounded-borders"
            />
            <q-tab
              v-if="showAdminTabs"
              name="languages"
              icon="translate"
              class="q-mx-sm q-mb-xs rounded-borders"
            />
            <q-tab
              v-if="showAdminTabs"
              name="texts"
              icon="text_fields"
              class="q-mx-sm q-mb-xs rounded-borders"
            />

            <q-separator v-if="!showAdminTabs" class="q-my-sm q-mx-md" />

            <q-tab
              v-if="!showAdminTabs"
              name="billing"
              icon="credit_card"
              class="q-mx-sm q-mb-xs rounded-borders"
              :class="{
                'text-negative': isActionRestricted,
                'text-warning': showWarningBanner && !isActionRestricted
              }"
            >
              <q-tooltip anchor="center right" self="center left" :offset="[10, 10]">
                {{ $t('seller.NAV_BILLING', 'Billing') }}
              </q-tooltip>
            </q-tab>

            <q-separator class="q-my-sm q-mx-md" />

            <q-tab
              name="setup"
              icon="settings"
              class="q-mx-sm q-mb-xs rounded-borders"
              :disable="isActionRestricted && !showAdminTabs"
            >
              <q-tooltip anchor="center right" self="center left" :offset="[10, 10]">
                {{
                  showAdminTabs
                    ? $t('admin.NAV_SETUP')
                    : $t('seller.HEADER_STORE_SETUP', 'Store Setup')
                }}
              </q-tooltip>
            </q-tab>
          </q-tabs>
        </div>
      </template>

      <template v-slot:after>
        <q-tab-panels
          v-model="adminStore.activePanel"
          animated
          vertical
          transition-prev="fade"
          transition-next="fade"
          class="fit bg-transparent"
          keep-alive
        >
          <q-tab-panel name="dashboard" class="q-pa-none full-height">
            <AdminDashboardPanel v-if="showAdminTabs" />
            <SellerDashboardPanel v-else />
          </q-tab-panel>

          <q-tab-panel name="orders" class="q-pa-none full-height">
            <OrdersPanel />
          </q-tab-panel>

          <q-tab-panel name="products" class="q-pa-none full-height">
            <ProductsPanel />
          </q-tab-panel>

          <q-tab-panel name="new products" class="q-pa-none full-height">
            <NewProductsPanel />
          </q-tab-panel>

          <q-tab-panel v-if="showAdminTabs" name="keys" class="q-pa-none full-height"
            ><KeysPanel
          /></q-tab-panel>
          <q-tab-panel v-if="showAdminTabs" name="ads" class="q-pa-none full-height"
            ><AdsPanel
          /></q-tab-panel>
          <q-tab-panel v-if="showAdminTabs" name="categories" class="q-pa-none full-height"
            ><CategoriesPanel
          /></q-tab-panel>
          <q-tab-panel v-if="showAdminTabs" name="languages" class="q-pa-none full-height"
            ><LanguagesPanel
          /></q-tab-panel>
          <q-tab-panel v-if="showAdminTabs" name="texts" class="q-pa-none full-height"
            ><TextsPanel
          /></q-tab-panel>

          <q-tab-panel v-if="!showAdminTabs" name="billing" class="q-pa-none full-height">
            <SellerBillingPanel />
          </q-tab-panel>

          <q-tab-panel name="setup" class="q-pa-none full-height">
            <SetupPanel v-if="showAdminTabs" />
            <SellerSetupPanel v-else />
          </q-tab-panel>
        </q-tab-panels>
      </template>
    </q-splitter>
  </div>
</template>

<script setup>
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
  import { useAdminStore } from 'src/stores/admin.store'
  import { useAuthStore } from 'src/stores/auth.store'
  import api from 'src/utils/api'

  import OrdersPanel from 'src/components/admin/OrdersPanel.vue'
  import ProductsPanel from 'src/components/admin/ProductsPanel.vue'
  import NewProductsPanel from 'src/components/admin/NewProductsPanel.vue'
  import KeysPanel from 'src/components/admin/KeysPanel.vue'
  import AdsPanel from 'src/components/admin/AdsPanel.vue'
  import CategoriesPanel from 'src/components/admin/CategoriesPanel.vue'
  import LanguagesPanel from 'src/components/admin/LanguagesPanel.vue'
  import TextsPanel from 'src/components/admin/TextsPanel.vue'
  import SetupPanel from 'src/components/admin/SetupPanel.vue'
  import SellerSetupPanel from 'src/components/admin/SellerSetupPanel.vue'
  import SellerDashboardPanel from 'src/components/admin/SellerDashboardPanel.vue'
  import SellerBillingPanel from 'src/components/admin/SellerBillingPanel.vue'
  import AdminDashboardPanel from 'src/components/admin/AdminDashboardPanel.vue'

  const adminStore = useAdminStore()
  const authStore = useAuthStore()
  const splitterModel = ref(60)

  // ==========================================
  // 🌟 IMPERSONATION AWARENESS LOGIC
  // ==========================================
  const isImpersonating = computed(() => {
    return authStore.isAdmin && !!adminStore.impersonatedSellerId
  })

  const showAdminTabs = computed(() => {
    return authStore.isAdmin && !isImpersonating.value
  })

  // ==========================================
  // 🌟 LOCKOUT & RESTRICTION LOGIC
  // ==========================================
  const isCardExpiringLocally = ref(false)

  const billingStatus = computed(
    () => authStore.userProfile?.storeProfile?.billingStatus || 'active'
  )
  const lockReason = computed(() => authStore.userProfile?.storeProfile?.billingLockReason || '')
  const accountStatus = computed(
    () => authStore.userProfile?.storeProfile?.accountStatus || 'active'
  )

  const isSuspended = computed(() => accountStatus.value === 'suspended' && !authStore.isAdmin)
  const isRestricted = computed(() => billingStatus.value === 'restricted' && !authStore.isAdmin)

  const isActionRestricted = computed(() => isSuspended.value || isRestricted.value)

  const showWarningBanner = computed(
    () =>
      !authStore.isAdmin &&
      !isActionRestricted.value &&
      (billingStatus.value === 'warning' || isCardExpiringLocally.value)
  )

  onMounted(async () => {
    // 🌟 THE FIX: If suspended, immediately force them to the 'orders' tab
    if (isSuspended.value && !['orders', 'billing'].includes(adminStore.activePanel)) {
      adminStore.activePanel = 'orders'
    } else if (isRestricted.value && !['orders', 'billing'].includes(adminStore.activePanel)) {
      adminStore.activePanel = 'billing'
    } else if (
      !adminStore.activePanel ||
      (!showAdminTabs.value &&
        ['keys', 'ads', 'categories', 'languages', 'texts'].includes(adminStore.activePanel))
    ) {
      adminStore.activePanel = 'dashboard'
    }

    checkExpiration()
    window.addEventListener('billing-updated', checkExpiration)
  })

  onUnmounted(() => {
    window.removeEventListener('billing-updated', checkExpiration)
  })

  watch(
    () => adminStore.activePanel,
    newTab => {
      // 🌟 THE FIX: Ensure the watcher also kicks them back to 'orders' if they try to escape
      if (isSuspended.value && !['orders', 'billing'].includes(newTab)) {
        adminStore.activePanel = 'orders'
      } else if (isRestricted.value && !['orders', 'billing'].includes(newTab)) {
        adminStore.activePanel = 'billing'
      }
    }
  )

  const checkExpiration = async () => {
    if (!showAdminTabs.value && !isActionRestricted.value && !isImpersonating.value) {
      try {
        const res = await api.get('/auth/seller/billing-card')
        if (res.data && res.data.hasCard) {
          const now = new Date()
          const currentMonth = now.getMonth() + 1
          const currentYear = now.getFullYear()
          const monthsLeft =
            (res.data.expYear - currentYear) * 12 + (res.data.expMonth - currentMonth)

          isCardExpiringLocally.value = monthsLeft <= 1 && monthsLeft >= 0
        } else {
          isCardExpiringLocally.value = false
        }
      } catch (err) {
        console.error('Failed to check card expiration', err)
      }
    } else {
      isCardExpiringLocally.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .q-splitter__before {
    border-right: 1px solid #e0e0e0;
  }
  .border-bottom {
    border-bottom: 1px solid #e0e0e0;
  }
</style>
