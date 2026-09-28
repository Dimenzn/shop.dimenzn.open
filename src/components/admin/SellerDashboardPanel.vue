<template>
  <div class="column full-height q-pa-sm relative-position">
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
          {{ $t('seller.HEADER_DASHBOARD', 'Store Overview & Analytics') }}
        </div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>

      <div class="col-12">
        <div class="row items-center justify-end q-col-gutter-xs">
          <div class="col-xs-12 col-sm-auto" :style="$q.screen.xs ? 'order: 1' : 'order: 1'">
            <q-btn
              size="sm"
              color="primary"
              unelevated
              outline
              icon="refresh"
              :label="$t('admin.BTN_REFRESH')"
              @click="forceRefresh"
              class="full-width bg-white rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md">
        <div style="display: grid; grid-template-columns: minmax(0, 1fr)">
          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12">
              <q-card flat bordered class="bg-white q-pa-md rounded-borders shadow-1">
                <div class="row items-center no-wrap">
                  <div class="col" style="min-width: 0; overflow: hidden">
                    <div class="text-overline text-grey-6 ellipsis">
                      {{ $t('seller.KPI_TRUST_SCORE', 'Seller Trust Rank') }}
                      <q-icon
                        name="workspace_premium"
                        :color="trustRank.textColor"
                        class="q-ml-xs cursor-pointer"
                      >
                        <q-tooltip class="bg-dark text-body2">
                          {{
                            $t(
                              'seller.TOOLTIP_TRUST',
                              'Process orders quickly and accurately to increase your SR and gain homepage visibility.'
                            )
                          }}
                        </q-tooltip>
                      </q-icon>
                    </div>
                    <div
                      class="text-h5 text-weight-bold ellipsis"
                      :class="`text-${trustRank.textColor}`"
                    >
                      {{ currentTrustScore }}
                      <span class="text-body2 text-weight-medium text-grey-6"
                        >SR / {{ trustRank.name }}</span
                      >
                    </div>
                  </div>
                  <div class="col-auto q-pl-sm">
                    <q-avatar
                      :color="trustRank.bgColor"
                      :text-color="trustRank.textColor"
                      :icon="trustRank.icon"
                      size="48px"
                    />
                  </div>
                </div>
                <q-linear-progress
                  rounded
                  size="4px"
                  :value="trustRank.progress"
                  :color="trustRank.textColor"
                  class="q-mt-sm bg-grey-2"
                />

                <q-slide-transition>
                  <div v-if="stats?.stagnantOrdersCount > 0" class="q-mt-md">
                    <q-banner dense rounded class="bg-red-1 text-negative border-red">
                      <template v-slot:avatar>
                        <q-icon name="warning" color="negative" />
                      </template>
                      <div class="text-weight-bold text-body2">
                        {{ $t('seller.WARN_STAGNANT_TITLE', 'Action Required: Active Penalties!') }}
                      </div>
                      <div class="text-caption text-grey-9">
                        {{
                          $t(
                            'seller.WARN_STAGNANT_DESC',
                            'You have {count} order(s) inactive for over 7 days. Your score is actively bleeding -10 SR every night until you resolve them.',
                            { count: stats?.stagnantOrdersCount }
                          )
                        }}
                      </div>
                    </q-banner>
                  </div>
                </q-slide-transition>
              </q-card>
            </div>

            <div class="col-12 col-sm-12 col-md-6">
              <q-card flat bordered class="bg-white q-pa-md rounded-borders shadow-1">
                <div class="row items-center no-wrap">
                  <div class="col" style="min-width: 0; overflow: hidden">
                    <div class="text-overline text-grey-6 ellipsis">
                      {{ $t('seller.KPI_EARNINGS', 'Total Earnings') }}
                    </div>
                    <div class="text-h5 text-weight-bold text-positive ellipsis">
                      {{ formatCurrency(stats?.totalEarned) }}
                    </div>
                  </div>
                  <div class="col-auto q-pl-sm">
                    <q-avatar
                      color="green-1"
                      text-color="positive"
                      icon="account_balance_wallet"
                      size="48px"
                    />
                  </div>
                </div>
              </q-card>
            </div>

            <div class="col-12 col-sm-6 col-md-6">
              <q-card flat bordered class="bg-white q-pa-md rounded-borders shadow-1">
                <div class="row items-center no-wrap">
                  <div class="col" style="min-width: 0; overflow: hidden">
                    <div class="text-overline text-grey-6 ellipsis">
                      {{ $t('seller.KPI_PENDING', 'Pending Payout') }}
                    </div>
                    <div class="text-h5 text-weight-bold text-orange-8 ellipsis">
                      {{ formatCurrency(stats?.pendingBalance) }}
                    </div>
                  </div>
                  <div class="col-auto q-pl-sm">
                    <q-avatar
                      color="orange-1"
                      text-color="orange-8"
                      icon="hourglass_empty"
                      size="48px"
                    />
                  </div>
                </div>
              </q-card>
            </div>

            <div class="col-12 col-sm-6 col-md-4">
              <q-card flat bordered class="bg-white q-pa-md rounded-borders shadow-1">
                <div class="row items-center no-wrap">
                  <div class="col" style="min-width: 0; overflow: hidden">
                    <div class="text-overline text-grey-6 ellipsis">
                      {{ $t('seller.KPI_FEES_OWED', 'Fees Owed') }}
                      <q-icon name="info" color="grey-5" class="q-ml-xs cursor-pointer">
                        <q-tooltip class="bg-dark text-body2">
                          {{
                            $t(
                              'seller.TOOLTIP_FEES_OWED',
                              'Platform fees accumulated from completed COD orders.'
                            )
                          }}
                        </q-tooltip>
                      </q-icon>
                    </div>
                    <div class="text-h5 text-weight-bold text-negative ellipsis">
                      {{ formatCurrency(stats?.platformFeesOwed) }}
                    </div>
                  </div>
                  <div class="col-auto q-pl-sm">
                    <q-avatar color="red-1" text-color="negative" icon="receipt_long" size="48px" />
                  </div>
                </div>
              </q-card>
            </div>

            <div class="col-12 col-sm-6 col-md-4">
              <q-card flat bordered class="bg-white q-pa-md rounded-borders shadow-1">
                <div class="row items-center no-wrap">
                  <div class="col" style="min-width: 0; overflow: hidden">
                    <div class="text-overline text-grey-6 ellipsis">
                      {{ $t('seller.KPI_ORDERS', 'Items Sold') }}
                    </div>
                    <div class="text-h5 text-weight-bold text-primary ellipsis">
                      {{ stats?.itemsSold || 0 }}
                    </div>
                  </div>
                  <div class="col-auto q-pl-sm">
                    <q-avatar
                      color="blue-1"
                      text-color="primary"
                      icon="local_shipping"
                      size="48px"
                    />
                  </div>
                </div>
              </q-card>
            </div>

            <div class="col-12 col-sm-6 col-md-4">
              <q-card flat bordered class="bg-white q-pa-md rounded-borders shadow-1">
                <div class="row items-center no-wrap">
                  <div class="col" style="min-width: 0; overflow: hidden">
                    <div class="text-overline text-grey-6 ellipsis">
                      {{ $t('seller.KPI_PRODUCTS', 'Active Products') }}
                    </div>
                    <div class="text-h5 text-weight-bold text-purple ellipsis">
                      {{ stats?.activeProducts || 0 }}
                    </div>
                  </div>
                  <div class="col-auto q-pl-sm">
                    <q-avatar color="purple-1" text-color="purple" icon="view_in_ar" size="48px" />
                  </div>
                </div>
              </q-card>
            </div>
          </div>

          <div class="row q-col-gutter-md q-mb-lg">
            <div class="col-12 col-md-6">
              <q-card
                flat
                bordered
                class="bg-white rounded-borders shadow-1 full-height"
                style="min-width: 0"
              >
                <q-card-section class="row items-center justify-between q-pb-none">
                  <div class="text-subtitle1 text-weight-bold text-grey-8 ellipsis">
                    {{ $t('seller.CHART_REVENUE', 'Revenue Overview') }}
                  </div>

                  <q-select
                    v-model="selectedTimeframe"
                    :options="timeframeOptions"
                    dense
                    borderless
                    options-dense
                    emit-value
                    map-options
                    class="text-weight-bold text-primary"
                    style="min-width: 135px"
                    @update:model-value="updateChartData"
                  />
                </q-card-section>

                <div class="q-mx-sm">
                  <q-card-section class="q-pt-none" style="height: 325px; overflow: hidden">
                    <vue-apex-charts
                      type="area"
                      width="100%"
                      height="90%"
                      :options="chartOptions"
                      :series="chartSeries"
                    />
                  </q-card-section>
                </div>
              </q-card>
            </div>
            <div class="col-12 col-md-6">
              <q-card
                flat
                bordered
                class="bg-white rounded-borders shadow-1 full-height"
                style="min-width: 0"
              >
                <q-card-section>
                  <div class="text-subtitle1 text-weight-bold text-grey-8 ellipsis">
                    {{ $t('seller.TABLE_TOP_PRODUCTS', 'Top Performing Products') }}
                  </div>
                </q-card-section>
                <div style="overflow-x: auto">
                  <q-card-section class="q-pa-sm" style="height: 100%">
                    <q-table
                      flat
                      :rows="topProducts"
                      :columns="columns"
                      row-key="id"
                      hide-pagination
                      :rows-per-page-options="[5]"
                      class="bg-transparent"
                    >
                      <template v-slot:body-cell-product="props">
                        <q-td :props="props">
                          <div class="row items-center no-wrap">
                            <q-avatar rounded size="32px" class="q-mr-sm shadow-1">
                              <img :src="props.row.image" />
                            </q-avatar>
                            <div class="text-caption ellipsis" style="max-width: 130px">
                              {{ props.row.title }}
                            </div>
                          </div>
                        </q-td>
                      </template>

                      <template v-slot:body-cell-status="props">
                        <q-td :props="props">
                          <q-badge
                            :color="props.row.stock > 0 ? 'positive' : 'negative'"
                            :label="
                              props.row.stock > 0
                                ? $t('seller.STATUS_IN_STOCK', 'In Stock')
                                : $t('seller.STATUS_OUT_OF_STOCK', 'Out of Stock')
                            "
                          />
                        </q-td>
                      </template>
                    </q-table>
                  </q-card-section>
                </div>
              </q-card>
            </div>
          </div>

          <div class="row q-col-gutter-md">
            <div class="col-12">
              <q-card flat bordered class="bg-white rounded-borders shadow-1">
                <q-card-section class="q-pb-sm row items-center justify-between">
                  <div class="row items-center no-wrap q-pb-sm">
                    <q-avatar size="36px" color="blue-1" text-color="primary" class="q-mr-sm">
                      <q-icon name="verified_user" size="20px" />
                    </q-avatar>
                    <div class="column justify-center">
                      <div
                        class="text-subtitle1 text-weight-bold text-grey-8"
                        style="line-height: 1.2"
                      >
                        {{ $t('seller.LBL_TRUST_LEADERBOARD', 'Trust Rank Leaderboard') }}
                      </div>
                      <div
                        class="text-caption text-grey-6 text-weight-medium"
                        style="line-height: 1"
                      >
                        {{
                          $t(
                            'seller.DESC_TRUST_LEADERBOARD',
                            'Ranked by fulfillment speed and reliability'
                          )
                        }}
                      </div>
                    </div>
                  </div>

                  <q-input
                    borderless
                    dense
                    debounce="300"
                    v-model="leaderboardFilter"
                    :placeholder="$t('seller.PLACEHOLDER_SEARCH', 'Search sellers...')"
                    class="bg-grey-2 q-px-sm rounded-borders"
                    style="width: 350px"
                  >
                    <template v-slot:append>
                      <q-icon name="search" color="grey-7" />
                    </template>
                  </q-input>
                </q-card-section>

                <div style="overflow-x: auto">
                  <q-table
                    flat
                    :rows="leaderboardData"
                    :columns="leaderboardColumns"
                    row-key="id"
                    :filter="leaderboardFilter"
                    :pagination="leaderboardPagination"
                    class="bg-transparent"
                  >
                    <template v-slot:body-cell-rank="props">
                      <q-td :props="props" class="text-weight-bold">
                        <q-avatar
                          :color="getRankInfo(props.row.trustScore).textColor"
                          text-color="white"
                          size="sm"
                          font-size="12px"
                        >
                          {{ props.row.absoluteRank }}
                        </q-avatar>
                      </q-td>
                    </template>

                    <template v-slot:body-cell-tier="props">
                      <q-td :props="props">
                        <q-chip
                          :color="getRankInfo(props.row.trustScore).bgColor"
                          :text-color="getRankInfo(props.row.trustScore).textColor"
                          dense
                          size="sm"
                          class="text-weight-bold"
                        >
                          <q-icon :name="getRankInfo(props.row.trustScore).icon" class="q-mr-xs" />
                          {{ props.row.trustScore }} SR
                        </q-chip>
                      </q-td>
                    </template>

                    <template v-slot:body-cell-actions="props">
                      <q-td :props="props" class="text-right">
                        <q-btn
                          flat
                          round
                          dense
                          color="primary"
                          icon="open_in_new"
                          @click="openCompetitorStore(props.row.id)"
                        >
                          <q-tooltip class="bg-dark text-body2">
                            {{ $t('seller.BTN_VIEW_STORE', 'View Store') }}
                          </q-tooltip>
                        </q-btn>
                      </q-td>
                    </template>
                  </q-table>
                </div>
              </q-card>
            </div>
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
  import { onMounted, computed, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'
  import { useUIStore } from 'src/stores/ui.store'
  import { useSellerStore } from 'src/stores/seller.store'
  import { useAuthStore } from 'src/stores/auth.store'
  import VueApexCharts from 'vue3-apexcharts'

  const { t, locale } = useI18n({ useScope: 'global' })
  const uiStore = useUIStore()
  const sellerStore = useSellerStore()
  const authStore = useAuthStore()

  const targetCurrency = computed(() => uiStore.ui[0]?.currency || 'USD')

  // ==========================================
  // 🌟 REFACTORED: GLOBAL RANK ENGINE HELPER
  // ==========================================
  const getRankInfo = score => {
    if (score < 1500) {
      return {
        name: t('seller.RANK_BRONZE', 'Bronze'),
        bgColor: 'brown-1',
        textColor: 'brown-8',
        icon: 'gavel',
        progress: score / 1499
      }
    }
    if (score < 2500) {
      return {
        name: t('seller.RANK_SILVER', 'Silver'),
        bgColor: 'blue-grey-1',
        textColor: 'blue-grey-7',
        icon: 'shield',
        progress: (score - 1500) / 999
      }
    }
    if (score < 3500) {
      return {
        name: t('seller.RANK_GOLD', 'Gold'),
        bgColor: 'amber-1',
        textColor: 'amber-9',
        icon: 'emoji_events',
        progress: (score - 2500) / 999
      }
    }
    return {
      name: t('seller.RANK_DIAMOND', 'Diamond'),
      bgColor: 'cyan-1',
      textColor: 'cyan-9',
      icon: 'diamond',
      progress: Math.min((score - 3500) / 1500, 1)
    }
  }

  // Seller's Personal Rank
  const currentTrustScore = computed(() => {
    return stats.value?.trustScore ?? authStore.user?.storeProfile?.trustScore ?? 1500
  })

  const trustRank = computed(() => getRankInfo(currentTrustScore.value))

  // ==========================================
  // 🌟 LEADERBOARD CONFIGURATION
  // ==========================================
  const leaderboardColumns = computed(() => [
    { name: 'rank', align: 'center', label: '#', field: 'rank', style: 'width: 50px' },
    {
      name: 'store',
      align: 'left',
      label: t('seller.COL_STORE_NAME', 'Store Name'),
      field: 'storeName'
    },
    {
      name: 'tier',
      align: 'right',
      label: t('seller.COL_SCORE_TIER', 'Score & Tier'),
      field: 'trustScore'
    },
    // 🌟 NEW: Actions Column
    {
      name: 'actions',
      align: 'right',
      label: '',
      field: 'actions',
      style: 'width: 50px'
    }
  ])

  // --- Actions ---
  const openCompetitorStore = sellerId => {
    // Opens the competitor's storefront in a new tab
    window.open(`/seller/${sellerId}`, '_blank')
  }

  const leaderboardFilter = ref('') // 🌟 Added for the search bar

  const leaderboardPagination = ref({
    page: 1,
    rowsPerPage: 10 // Show 10 sellers per page
  })

  // We inject 'absoluteRank' here so that if a seller is on Page 3,
  // they still show as #25 instead of resetting to #1 on that page!
  const leaderboardData = computed(() => {
    const rawList = stats.value?.leaderboard || []
    return rawList.map((seller, index) => ({
      ...seller,
      absoluteRank: index + 1
    }))
  })

  // --- Timeframe Dropdown Logic ---
  const selectedTimeframe = ref('7d')

  const timeframeOptions = computed(() => [
    { label: t('seller.TIMEFRAME_7D', 'Last 7 Days'), value: '7d' },
    { label: t('seller.TIMEFRAME_30D', 'Last 30 Days'), value: '30d' },
    { label: t('seller.TIMEFRAME_12M', 'Last 12 Months'), value: '12m' }
  ])

  const updateChartData = () => {
    sellerStore.fetchDashboardData(selectedTimeframe.value)
  }

  const forceRefresh = () => {
    sellerStore.fetchDashboardData(selectedTimeframe.value, true)
  }

  const chartTickAmount = computed(() => {
    if (selectedTimeframe.value === '12m') return 12
    if (selectedTimeframe.value === '7d') return 7
    return 15
  })

  const {
    dashboardStats: stats,
    topProducts,
    revenueChart,
    isLoadingDashboard
  } = storeToRefs(sellerStore)

  // --- Top Products Table Configuration ---
  const columns = computed(() => [
    { name: 'product', align: 'left', label: t('seller.COL_PRODUCT', 'Product'), field: 'title' },
    {
      name: 'sold',
      align: 'center',
      label: t('seller.COL_SOLD', 'Sold'),
      field: 'sold',
      sortable: true
    },
    { name: 'status', align: 'right', label: t('seller.COL_STATUS', 'Status'), field: 'stock' }
  ])

  // --- Chart Configuration ---
  const chartOptions = computed(() => ({
    chart: {
      type: 'area',
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    colors: ['#1976D2'],
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100]
      }
    },
    xaxis: {
      categories: revenueChart.value?.categories || [],
      tickAmount: chartTickAmount.value,
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: {
        formatter: val => formatCurrency(val)
      }
    },
    grid: {
      borderColor: '#f1f1f1',
      strokeDashArray: 4,
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
      padding: {
        right: 30,
        left: 10
      }
    }
  }))

  const chartSeries = computed(() => [
    {
      name: t('seller.CHART_SERIES_NAME', 'Revenue'),
      data: revenueChart.value?.data || []
    }
  ])

  // --- Formatter ---
  const formatCurrency = val => {
    try {
      return new Intl.NumberFormat(locale.value || 'en-US', {
        style: 'currency',
        currency: targetCurrency.value,
        maximumFractionDigits: 0
      }).format(val || 0)
    } catch {
      return `${val || 0} ${targetCurrency.value}`
    }
  }

  // Fetch on load!
  onMounted(() => {
    sellerStore.fetchDashboardData(selectedTimeframe.value)
  })
</script>

<style scoped>
  .text-truncate {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
