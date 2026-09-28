<template>
  <div class="column fit q-pa-sm bg-white relative-position">
    <div class="row q-mb-md q-pr-md">
      <q-chip
        dense
        outline
        square
        color="primary"
        text-color="white"
        class="col-12 text-overline no-border-radius"
        style="margin-left: 0px"
      >
        <div class="full-width text-center">
          {{ $t('admin.HEADER_DASHBOARD', 'Sellers Overview & Analytics') }}
        </div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              color="primary"
              unelevated
              outline
              icon="refresh"
              :label="$t('admin.BTN_REFRESH')"
              @click="fetchSellers"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              color="warning"
              text-color="dark"
              unelevated
              icon="payment"
              :label="$t('admin.BTN_CHARGE_ALL', 'Charge Active Sellers')"
              @click="confirmChargeAll"
              :loading="isChargingAll"
              :disable="totalChargeable <= 0"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="col relative-position">
      <q-scroll-area class="absolute-full q-pb-xl q-pr-md">
        <div style="display: grid; grid-template-columns: minmax(0, 1fr)">
          <div class="row q-col-gutter-md q-mb-lg q-pt-sm">
            <div class="col-12 col-md-4">
              <q-card flat bordered class="bg-grey-1 rounded-borders q-pa-md border-left-primary">
                <div class="text-caption text-grey-7 text-uppercase text-weight-bold">
                  {{ $t('admin.METRIC_TOTAL_OWED', 'Total Fees Owed') }}
                </div>
                <div class="text-h4 text-primary text-weight-bold q-mt-sm">
                  {{ formatPrice(totalOwed) }}
                </div>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered class="bg-green-1 rounded-borders q-pa-md border-left-green">
                <div class="text-caption text-green-8 text-uppercase text-weight-bold">
                  {{ $t('admin.METRIC_CHARGEABLE', 'Ready to Charge (Active)') }}
                </div>
                <div class="text-h4 text-green-9 text-weight-bold q-mt-sm">
                  {{ formatPrice(totalChargeable) }}
                </div>
              </q-card>
            </div>
            <div class="col-12 col-md-4">
              <q-card flat bordered class="bg-red-1 rounded-borders q-pa-md border-left-red">
                <div
                  class="text-caption text-negative text-uppercase text-weight-bold flex items-center"
                >
                  {{ $t('admin.METRIC_AT_RISK', 'At Risk (Restricted)') }}
                  <q-icon name="info" size="xs" class="q-ml-xs">
                    <q-tooltip>{{
                      $t(
                        'admin.TOOLTIP_AT_RISK_INFO',
                        'Sellers with debt but no valid payment method.'
                      )
                    }}</q-tooltip>
                  </q-icon>
                </div>
                <div class="text-h4 text-negative text-weight-bold q-mt-sm">
                  {{ formatPrice(totalAtRisk) }}
                </div>
              </q-card>
            </div>
          </div>

          <div class="row items-center justify-between q-mb-sm">
            <div class="text-subtitle1 text-weight-bold text-grey-8">
              <q-icon name="group" color="primary" size="sm" class="q-mr-xs" />
              {{ $t('admin.LBL_SELLER_DIR', 'Platform Sellers Directory') }}
            </div>
            <q-input
              borderless
              dense
              debounce="300"
              v-model="searchFilter"
              :placeholder="$t('seller.PLACEHOLDER_SEARCH', 'Search sellers...')"
              class="bg-grey-2 q-px-sm rounded-borders"
              style="width: 350px"
            >
              <template v-slot:append>
                <q-icon name="search" color="grey-7" />
              </template>
            </q-input>
          </div>

          <div style="overflow-x: auto">
            <q-table
              flat
              bordered
              class="rounded-borders sticky-header-table"
              style="min-width: 1000px"
              :rows="sellers"
              :columns="columns"
              row-key="_id"
              :loading="isLoadingDashboard"
              :filter="searchFilter"
              :pagination="{ rowsPerPage: 15, sortBy: 'trustScore', descending: true }"
            >
              <template v-slot:body-cell-trustScore="props">
                <q-td :props="props">
                  <q-chip
                    :color="getRankInfo(props.row.storeProfile?.trustScore).bgColor"
                    :text-color="getRankInfo(props.row.storeProfile?.trustScore).textColor"
                    dense
                    size="sm"
                    class="text-weight-bold"
                  >
                    <q-icon
                      :name="getRankInfo(props.row.storeProfile?.trustScore).icon"
                      class="q-mr-xs"
                    />
                    {{ props.row.storeProfile?.trustScore ?? 1500 }} SR
                  </q-chip>
                </q-td>
              </template>

              <template v-slot:body-cell-billingStatus="props">
                <q-td :props="props">
                  <q-chip
                    v-if="
                      props.row.storeProfile?.billingStatus === 'active' ||
                      !props.row.storeProfile?.billingStatus
                    "
                    color="green-2"
                    text-color="green-9"
                    dense
                    size="sm"
                    class="text-weight-bold"
                  >
                    {{ $t('admin.STATUS_ACTIVE', 'ACTIVE') }}
                  </q-chip>
                  <q-chip
                    v-else-if="props.row.storeProfile?.billingStatus === 'warning'"
                    color="orange-2"
                    text-color="orange-9"
                    dense
                    size="sm"
                    class="text-weight-bold"
                  >
                    {{ $t('admin.STATUS_WARNING', 'WARNING') }}
                  </q-chip>
                  <q-chip
                    v-else
                    color="red-2"
                    text-color="negative"
                    dense
                    size="sm"
                    class="text-weight-bold"
                  >
                    {{ $t('admin.STATUS_RESTRICTED', 'RESTRICTED') }}
                    <q-tooltip class="bg-negative">
                      {{
                        props.row.storeProfile?.billingLockReason
                          ? $t(props.row.storeProfile.billingLockReason)
                          : $t('admin.TOOLTIP_RESTRICTED', 'Billing Restricted')
                      }}
                    </q-tooltip>
                  </q-chip>
                </q-td>
              </template>

              <template v-slot:body-cell-accountStatus="props">
                <q-td :props="props">
                  <q-chip
                    v-if="props.row.storeProfile?.accountStatus === 'suspended'"
                    color="negative"
                    text-color="white"
                    icon="block"
                    dense
                    size="sm"
                    class="text-weight-bold shadow-1"
                  >
                    {{ $t('admin.STATUS_SUSPENDED', 'SUSPENDED') }}
                  </q-chip>
                  <q-chip
                    v-else
                    color="blue-grey-1"
                    text-color="blue-grey-7"
                    icon="check_circle"
                    dense
                    size="sm"
                    class="text-weight-bold"
                  >
                    {{ $t('admin.STATUS_APPROVED', 'APPROVED') }}
                  </q-chip>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" class="text-right">
                  <q-btn
                    v-if="(props.row.storeProfile?.platformFeesOwed || 0) > 0"
                    size="sm"
                    dense
                    color="warning"
                    text-color="dark"
                    icon="payment"
                    :label="$t('admin.BTN_CHARGE', 'Charge')"
                    class="q-px-sm"
                    :loading="chargingSellerId === props.row._id"
                    @click="confirmSingleCharge(props.row)"
                  />
                  <span v-else class="text-grey-5 text-caption text-weight-medium">
                    {{ $t('admin.LBL_SETTLED', 'Settled') }}
                  </span>

                  <q-btn
                    flat
                    round
                    dense
                    :color="
                      props.row.storeProfile?.accountStatus === 'suspended'
                        ? 'positive'
                        : 'negative'
                    "
                    :icon="
                      props.row.storeProfile?.accountStatus === 'suspended' ? 'lock_open' : 'gavel'
                    "
                    @click="toggleSuspension(props.row)"
                    class="q-ml-md"
                  >
                    <q-tooltip class="bg-dark text-body2">
                      {{
                        props.row.storeProfile?.accountStatus === 'suspended'
                          ? $t('admin.BTN_REACTIVATE', 'Reactivate Store')
                          : $t('admin.BTN_SUSPEND', 'Suspend Store')
                      }}
                    </q-tooltip>
                  </q-btn>

                  <q-btn
                    flat
                    round
                    dense
                    color="primary"
                    icon="open_in_new"
                    @click="openCompetitorStore(props.row._id)"
                    class="q-ml-md"
                  >
                    <q-tooltip class="bg-dark text-body2">
                      {{ $t('seller.BTN_VIEW_STORE', 'View Store') }}
                    </q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </div>
        </div>
      </q-scroll-area>
    </div>

    <q-inner-loading :showing="isLoadingDashboard">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useQuasar } from 'quasar'
  import { useI18n } from 'vue-i18n'
  import { useUIStore } from 'src/stores/ui.store'
  import api from 'src/utils/api'

  const $q = useQuasar()
  const { t, locale } = useI18n({ useScope: 'global' })
  const uiStore = useUIStore()

  // --- State ---
  const isLoadingDashboard = ref(false)
  const isChargingAll = ref(false)
  const chargingSellerId = ref(null)
  const sellers = ref([])
  const searchFilter = ref('')

  // ==========================================
  // 🌟 REFACTORED: GLOBAL RANK ENGINE HELPER
  // ==========================================
  const getRankInfo = score => {
    const s = score ?? 1500
    if (s < 1500) {
      return {
        name: t('seller.RANK_BRONZE', 'Bronze'),
        bgColor: 'brown-1',
        textColor: 'brown-8',
        icon: 'gavel'
      }
    }
    if (s < 2500) {
      return {
        name: t('seller.RANK_SILVER', 'Silver'),
        bgColor: 'blue-grey-1',
        textColor: 'blue-grey-7',
        icon: 'shield'
      }
    }
    if (s < 3500) {
      return {
        name: t('seller.RANK_GOLD', 'Gold'),
        bgColor: 'amber-1',
        textColor: 'amber-9',
        icon: 'emoji_events'
      }
    }
    return {
      name: t('seller.RANK_DIAMOND', 'Diamond'),
      bgColor: 'cyan-1',
      textColor: 'cyan-9',
      icon: 'diamond'
    }
  }

  // --- Table Configuration ---
  const columns = computed(() => [
    {
      name: 'seller',
      label: t('admin.COL_STORE', 'Store / Email'),
      align: 'left',
      field: row => row.storeProfile?.storeName || row.email,
      sortable: true
    },
    {
      name: 'trustScore',
      label: t('seller.COL_SCORE_TIER', 'Trust Rank'),
      align: 'center',
      field: row => row.storeProfile?.trustScore ?? 1500,
      sortable: true
    },
    {
      name: 'owed',
      label: t('admin.COL_OWED', 'Fees Owed'),
      align: 'right',
      field: row => row.storeProfile?.platformFeesOwed || 0,
      format: val => formatPrice(val),
      sortable: true
    },
    {
      name: 'billingStatus',
      label: t('admin.COL_STATUS', 'Billing Status'),
      align: 'center',
      field: row => row.storeProfile?.billingStatus || 'active',
      sortable: true
    },
    {
      name: 'accountStatus',
      label: t('admin.COL_ACCOUNT', 'Store Status'),
      align: 'center',
      field: row => row.storeProfile?.accountStatus || 'active',
      sortable: true
    },
    {
      name: 'actions',
      label: t('admin.COL_ACTIONS', 'Actions'),
      align: 'right'
    }
  ])

  // --- Computed Metrics ---
  const currency = computed(() => uiStore.ui[0]?.currency || 'USD')

  const totalOwed = computed(() => {
    return sellers.value.reduce(
      (sum, seller) => sum + (seller.storeProfile?.platformFeesOwed || 0),
      0
    )
  })

  const totalChargeable = computed(() => {
    return sellers.value
      .filter(s => s.storeProfile?.billingStatus === 'active')
      .reduce((sum, seller) => sum + (seller.storeProfile?.platformFeesOwed || 0), 0)
  })

  const totalAtRisk = computed(() => {
    return sellers.value
      .filter(s => s.storeProfile?.billingStatus !== 'active')
      .reduce((sum, seller) => sum + (seller.storeProfile?.platformFeesOwed || 0), 0)
  })

  // --- Lifecycle & Data Fetching ---
  onMounted(() => {
    fetchSellers()
  })

  const fetchSellers = async () => {
    isLoadingDashboard.value = true
    try {
      const response = await api.get('/auth/admin/users')
      sellers.value = response.data.users.filter(u => u.role === 'seller')
    } catch (error) {
      console.error('Failed to fetch sellers:', error)
    } finally {
      isLoadingDashboard.value = false
    }
  }

  // --- Actions ---
  const openCompetitorStore = sellerId => {
    window.open(`/seller/${sellerId}`, '_blank')
  }

  const confirmChargeAll = () => {
    $q.dialog({
      title: t('admin.DIALOG_CHARGE_ALL_TITLE', 'Run Batch Billing'),
      message: t('admin.DIALOG_CHARGE_ALL_DESC', { amount: formatPrice(totalChargeable.value) }),
      cancel: true,
      persistent: true,
      color: 'primary'
    }).onOk(async () => {
      isChargingAll.value = true
      try {
        await api.post('/auth/admin/billing/charge-all')
        await fetchSellers()
      } catch (error) {
        console.error('Failed to charge all:', error)
      } finally {
        isChargingAll.value = false
      }
    })
  }

  const confirmSingleCharge = seller => {
    const amount = formatPrice(seller.storeProfile?.platformFeesOwed || 0)
    $q.dialog({
      title: t('admin.DIALOG_CHARGE_TITLE', 'Charge Seller'),
      message: t('admin.DIALOG_CHARGE_DESC', { email: seller.email, amount }),
      cancel: true,
      persistent: true,
      color: 'primary'
    }).onOk(async () => {
      chargingSellerId.value = seller._id
      try {
        await api.post(`/auth/admin/billing/charge/${seller._id}`)
        await fetchSellers()
      } catch (error) {
        console.error('Failed to charge seller:', error)
      } finally {
        chargingSellerId.value = null
      }
    })
  }

  const toggleSuspension = seller => {
    const isSuspended = seller.storeProfile?.accountStatus === 'suspended'
    const actionKey = isSuspended ? 'admin.TIT_REACTIVATE_SELLER' : 'admin.TIT_SUSPEND_SELLER'
    const msgKey = isSuspended ? 'admin.MSG_REACTIVATE_CONFIRM' : 'admin.MSG_SUSPEND_CONFIRM'
    const sellerName = seller.storeProfile?.storeName || seller.email

    $q.dialog({
      title: t(actionKey, isSuspended ? 'Reactivate Seller' : 'Suspend Seller'),
      message: t(msgKey, { name: `<b>${sellerName}</b>` }),
      html: true,
      cancel: true,
      persistent: true,
      color: isSuspended ? 'positive' : 'negative'
    }).onOk(async () => {
      try {
        await api.post(`/auth/admin/seller/${seller._id}/toggle-status`)
        await fetchSellers() // Refresh the table
      } catch (error) {
        console.error('Failed to toggle status:', error)
      }
    })
  }

  // --- Helpers ---
  const formatPrice = value => {
    if (!value) return `0 ${currency.value}`
    try {
      return new Intl.NumberFormat([locale.value], {
        style: 'currency',
        currency: currency.value
      }).format(value)
    } catch {
      return `${value} ${currency.value}`
    }
  }
</script>

<style scoped>
  /* Ensure Sticky Header Works identical to OrdersPanel */
  .sticky-header-table {
    height: 100%;

    :deep(.q-table__top),
    :deep(.q-table__bottom),
    :deep(thead tr:first-child th) {
      background-color: #fff;
    }

    :deep(thead tr th) {
      position: sticky;
      z-index: 1;
    }

    :deep(thead tr:first-child th) {
      top: 0;
    }

    :deep(.q-table--loading thead tr:last-child th) {
      top: 48px;
    }

    :deep(tbody) {
      scroll-margin-top: 48px;
    }
  }

  .border-left-primary {
    border-left: 4px solid var(--q-primary);
  }
  .border-left-green {
    border-left: 4px solid var(--q-positive);
  }
  .border-left-red {
    border-left: 4px solid var(--q-negative);
  }
</style>
