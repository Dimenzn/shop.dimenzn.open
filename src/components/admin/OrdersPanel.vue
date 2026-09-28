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
        <div class="full-width text-center">{{ $t('admin.HEADER_ORDERS_LIST') }}</div>
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
              @click="refreshTable()"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>

          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              :color="hasChanges ? 'positive' : 'grey-4'"
              :text-color="hasChanges ? 'white' : 'grey-6'"
              :disable="!hasChanges"
              unelevated
              icon="save"
              :label="$t('admin.BTN_SAVE')"
              @click="saveLocal"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="row q-mb-md q-pr-md q-col-gutter-sm items-center">
      <div class="col-12 col-md-auto" style="min-width: 250px">
        <q-select
          v-model="filterStatuses"
          :options="filterOptions"
          dense
          outlined
          multiple
          emit-value
          map-options
          :label="$t('admin.LBL_FILTER_STATUS')"
          class="bg-white full-width"
          @update:model-value="refreshTable"
          :disable="!!filter"
        >
          <template v-slot:selected>
            <div v-if="filterStatuses.length > 0" class="text-caption q-px-xs">
              {{ filterStatuses.length }} {{ $t('label.LBL_SELECTED') }}
            </div>
          </template>

          <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
            <q-item v-bind="itemProps">
              <q-item-section side>
                <q-checkbox :model-value="selected" @update:model-value="toggleOption(opt)" />
              </q-item-section>

              <q-item-section>
                <q-chip
                  dense
                  square
                  :color="getStatusColor(opt.value)"
                  text-color="white"
                  class="text-caption"
                >
                  {{ opt.label }}
                </q-chip>
              </q-item-section>
            </q-item>
          </template>
        </q-select>

        <q-tooltip v-if="filter">{{ $t('admin.HINT_FILTER_IGNORED') }}</q-tooltip>
      </div>

      <div class="col-12 col-md-auto" style="min-width: 250px">
        <q-input
          v-model="filter"
          dense
          outlined
          :placeholder="$t('admin.ORDER_SEARCH')"
          class="bg-white full-width"
          debounce="500"
          @update:model-value="refreshTable"
          clearable
        >
          <template v-slot:append>
            <q-icon name="search" />
          </template>
        </q-input>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md">
        <div class="fit">
          <q-table
            flat
            bordered
            class="sticky-header-table full-height"
            row-key="_id"
            :rows="orders"
            :columns="columns"
            :loading="loading"
            v-model:pagination="ordersPaging"
            @request="onRequest"
            binary-state-sort
            :rows-per-page-options="[10, 20, 50]"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-btn
                  unelevated
                  dense
                  no-caps
                  :color="getStatusColor(props.row.status)"
                  text-color="white"
                  class="q-px-sm"
                  :disable="props.row.status === 'delivered' && !authStore.isAdmin"
                  @click="openStatusDialog(props.row)"
                >
                  <q-badge
                    v-if="modifiedOrders.has(props.row._id)"
                    color="negative"
                    floating
                    rounded
                    dot
                  />
                  {{ getStatusLabel(props.row.status) }}
                  <q-icon name="arrow_drop_down" class="q-ml-sm" size="xs" />
                </q-btn>
              </q-td>
            </template>

            <template v-slot:body-cell-total="props">
              <q-td :props="props" class="text-bold text-primary">
                {{ formatCurrency(props.row.totalAmount, props.row.currency) }}
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" auto-width>
                <q-btn
                  flat
                  dense
                  round
                  color="primary"
                  icon="visibility"
                  @click="openOrderDetails(props.row)"
                >
                  <q-tooltip>{{ $t('admin.ORDER_VIEW_DETAILS') }}</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </div>
      </q-scroll-area>
    </div>

    <q-dialog
      v-model="statusDialog"
      persistent
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      <q-card
        class="text-center q-pa-lg relative-position"
        style="border-radius: 16px"
        :style="{ width: '420px', maxWidth: '90vw' }"
      >
        <q-btn
          icon="close"
          flat
          round
          dense
          v-close-popup
          class="absolute-top-right q-ma-sm text-grey-5 hover-text-primary"
          style="z-index: 10"
        />

        <div class="q-mb-md q-mt-sm">
          <q-avatar
            size="80px"
            :color="getStatusColor(pendingStatus)"
            text-color="white"
            icon="local_shipping"
            class="shadow-3 transition-colors"
          />
        </div>

        <div class="text-h5 text-weight-bold q-mb-xs">
          {{ t('title.UPDATE_STATUS', 'Update Order Status') }}
        </div>

        <div class="text-grey-7 q-mb-md">
          {{
            t('label.UPDATE_STATUS_DESC', 'Manage fulfillment and build your Seller Trust Score.')
          }}
        </div>

        <div class="text-caption text-weight-bold text-uppercase q-mb-md text-grey-8">
          <q-icon name="schedule" class="q-mr-xs" size="sm" />
          {{ t('label.ORDER_AGE', 'Order Age') }}:
          <span :class="orderAgeHours > 48 ? 'text-negative' : 'text-primary'">
            {{ orderAgeFormatted }}
          </span>
        </div>

        <q-select
          v-model="pendingStatus"
          :options="statusOptions"
          outlined
          emit-value
          map-options
          class="q-mb-md text-left text-weight-bold"
          :label="t('label.NEW_STATUS', 'Select New Status')"
        >
          <template v-slot:selected>
            <q-chip
              dense
              square
              text-color="white"
              :color="getStatusColor(pendingStatus)"
              class="q-ml-none"
            >
              {{ getStatusLabel(pendingStatus) }}
            </q-chip>
          </template>
        </q-select>

        <q-banner
          v-if="statusHint"
          rounded
          class="q-mb-lg text-left text-body2"
          :class="statusHint.bgClass"
        >
          <template v-slot:avatar>
            <q-icon :name="statusHint.icon" :color="statusHint.color" />
          </template>
          <div class="text-weight-bold" :class="`text-${statusHint.color}`">
            {{ statusHint.title }}
          </div>
          <div class="text-grey-9 q-mt-xs" style="line-height: 1.3">
            {{ statusHint.desc }}
          </div>
        </q-banner>

        <q-btn
          unelevated
          rounded
          color="primary"
          class="full-width q-py-sm text-weight-bold"
          @click="confirmStatusChange"
          :disable="pendingStatus === activeOrder?.status"
        >
          {{ t('button.BTN_CONFIRM_STS', 'Confirm Status') }}
        </q-btn>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailsDialog" full-width>
      <q-card
        v-if="selectedOrder"
        id="invoice-card"
        class="shipping-note-card full-width bg-white"
        style="border-radius: 16px"
        flat
        bordered
      >
        <div class="row items-start q-pa-md bg-grey-1 relative-position">
          <div class="absolute-top-right">
            <q-btn
              class="q-ma-sm"
              round
              color="dark"
              text-color="white"
              icon="print"
              size="sm"
              @click="exportToPDF"
              :loading="isGeneratingPdf"
              data-html2canvas-ignore="true"
            >
              <q-tooltip>{{ $t('admin.BTN_DOWNLOAD_PDF') }}</q-tooltip>
            </q-btn>
            <q-btn
              round
              flat
              color="grey-7"
              class="q-ma-sm bg-grey-3"
              icon="close"
              size="sm"
              v-close-popup
              data-html2canvas-ignore="true"
            />
          </div>
          <div class="col-12 col-sm-6">
            <div class="text-h6 text-primary text-uppercase text-weight-bold">
              {{ companyName }}
            </div>
            <div class="text-caption text-grey-8">{{ $t('title.ORDER_CONFIRMATION') }}</div>
          </div>
          <div class="col-12 col-sm-6 text-sm-right q-mt-sm q-mt-sm-none">
            <div class="text-subtitle1 text-weight-bold">
              {{ $t('label.ORDER_ID') }} <span class="text-primary">{{ selectedOrder._id }}</span>
            </div>
            <div class="text-caption text-grey-8">{{ formatDate(selectedOrder.createdAt) }}</div>
          </div>
        </div>
        <q-separator />
        <div class="row q-pa-md q-col-gutter-md">
          <div class="col-12 col-sm-6">
            <div class="text-subtitle2 text-primary q-mb-xs">
              {{ $t('label.CUSTOMER_DETAILS') }}
            </div>
            <div class="text-body2 text-grey-9">
              <div class="text-weight-bold">
                {{ selectedOrder.contactInfo?.firstName }} {{ selectedOrder.contactInfo?.lastName }}
              </div>
              <div>{{ selectedOrder.contactInfo?.email }}</div>
              <div>{{ formatPhone(selectedOrder.contactInfo?.phone) }}</div>
            </div>
          </div>
          <div class="col-12 col-sm-6 text-sm-right">
            <div class="text-subtitle2 text-primary q-mb-xs">{{ $t('label.SHIPPING_TO') }}</div>
            <div class="text-body2 text-grey-9">
              <div>{{ selectedOrder.shippingAddress?.address }}</div>
              <div>
                {{ selectedOrder.shippingAddress?.city }},
                {{ selectedOrder.shippingAddress?.postalCode }}
              </div>
              <div v-if="showCountryField" class="text-uppercase">
                {{ selectedOrder.shippingAddress?.country }}
              </div>
            </div>
          </div>
        </div>
        <div class="q-pa-none">
          <q-markup-table flat separator="horizontal" dense class="no-shadow">
            <thead class="bg-grey-2 text-grey-8">
              <tr>
                <th class="text-left q-pl-md">{{ $t('label.TBL_PRODUCT') }}</th>
                <th class="text-right">{{ $t('label.TBL_PRICE') }}</th>
                <th class="text-right">{{ $t('label.TBL_QUANTITY') }}</th>
                <th class="text-right q-pr-md">{{ $t('label.TBL_TOTAL') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in selectedOrder.items" :key="index">
                <td class="text-left q-pl-md q-py-sm">
                  <div class="row items-center no-wrap">
                    <q-avatar rounded size="40px" class="q-mr-sm bg-grey-3">
                      <img
                        v-if="item.image"
                        :src="item.image"
                        style="object-fit: cover"
                        alt="product image"
                      />
                      <q-icon v-else name="image_not_supported" color="grey" />
                    </q-avatar>
                    <div>
                      <div class="text-body2 text-weight-medium line-clamp-1">{{ item.title }}</div>
                      <div v-if="item.size" class="text-caption text-primary">
                        {{ $t('label.PROD_SIZE') }}: <strong>{{ item.size }}</strong>
                      </div>
                    </div>
                  </div>
                </td>
                <td class="text-right">{{ formatCurrency(item.price, selectedOrder.currency) }}</td>
                <td class="text-right">x{{ item.quantity }}</td>
                <td class="text-right text-weight-bold q-pr-md">
                  {{ formatCurrency(item.price * item.quantity, selectedOrder.currency) }}
                </td>
              </tr>
            </tbody>
          </q-markup-table>
        </div>
        <q-separator />
        <div class="row justify-end q-pa-md bg-grey-1">
          <div class="col-12 col-sm-6 col-md-4">
            <div class="row justify-between q-mb-sm text-caption">
              <span class="text-grey-8">{{ $t('label.PAY_METHOD_TITLE') }}:</span>
              <span class="text-weight-bold text-uppercase text-primary">
                {{
                  selectedOrder.paymentMethod === 'cod'
                    ? $t('label.PAY_COD_TITLE')
                    : selectedOrder.paymentMethod === 'agreement'
                      ? $t('label.PAY_AGREEMENT_TITLE')
                      : $t('label.PAY_ONLINE')
                }}
              </span>
            </div>
            <q-separator class="q-my-sm" />
            <div class="row justify-between q-mb-xs text-body2">
              <span class="text-grey-8">{{ $t('label.PRICE_SUBTOTAL') }}:</span>
              <span>{{ formatCurrency(itemsSubtotal, selectedOrder.currency) }}</span>
            </div>
            <div class="row justify-between q-mb-sm text-body2">
              <span class="text-grey-8">{{ $t('label.PRICE_SHIPPING') }}:</span>
              <span>{{ formatCurrency(calculatedShipping, selectedOrder.currency) }}</span>
            </div>
            <q-separator color="primary" class="q-my-sm" />
            <div class="row justify-between text-h6 text-primary">
              <span class="text-weight-bold">{{ $t('label.PRICE_TOTAL') }}:</span>
              <span class="text-weight-bolder">{{
                formatCurrency(selectedOrder.totalAmount, selectedOrder.currency)
              }}</span>
            </div>
          </div>
        </div>
        <div v-if="selectedOrder.note" class="q-pa-md">
          <div class="bg-yellow-1 q-pa-sm rounded-borders text-body2 border-yellow">
            <span class="text-weight-bold text-orange-9">{{ $t('label.LBL_NOTE') }}:</span>
            {{ selectedOrder.note }}
          </div>
        </div>
      </q-card>
    </q-dialog>

    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup>
  // --- Imports ---
  import { ref, computed, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'
  import { date } from 'quasar'
  import html2pdf from 'html2pdf.js'

  // Stores
  import { useAdminStore } from 'src/stores/admin.store'
  import { useUIStore } from 'stores/ui.store'
  import { useAuthStore } from 'src/stores/auth.store'

  // --- Setup ---
  const uiStore = useUIStore()
  const adminStore = useAdminStore()
  const authStore = useAuthStore()

  // Destructure state from store
  const { ordersPaging, modifiedOrders } = storeToRefs(adminStore)
  const { locale, t } = useI18n({ useScope: 'global' })

  // --- State ---
  const filter = ref('')
  const loading = ref(false)
  const currentTime = ref(Date.now())

  // Details Dialog State
  const detailsDialog = ref(false)
  const selectedOrder = ref(null)
  const isGeneratingPdf = ref(false)

  // 🌟 NEW: Status Dialog State
  const statusDialog = ref(false)
  const activeOrder = ref(null)
  const pendingStatus = ref('')

  // FILTER: Statuses
  const filterStatuses = ref([
    'pending',
    'confirmed',
    'shipped',
    'delivered',
    'cancelled',
    'cancelled_restored'
  ])

  const exportToPDF = () => {
    isGeneratingPdf.value = true
    const element = document.getElementById('invoice-card')

    const opt = {
      margin: 10,
      filename: `${t('label.INVOICE')}_${selectedOrder.value._id}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, allowTaint: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        isGeneratingPdf.value = false
      })
      .catch(error => {
        console.error('PDF Generation Failed:', error)
        isGeneratingPdf.value = false
      })
  }

  // --- Computed Configurations ---
  const companyName = computed(() => uiStore.ui[0]?.companyName || 'Company Name')
  const targetUI = computed(() => uiStore.ui[0] || {})

  const filterOptions = computed(() => [
    { label: t('label.ORDER_PENDING'), value: 'pending' },
    { label: t('label.ORDER_CONFIRM'), value: 'confirmed' },
    { label: t('label.ORDER_SHIP'), value: 'shipped' },
    { label: t('label.ORDER_DELIVER'), value: 'delivered' },
    { label: t('label.ORDER_CANCEL'), value: 'cancelled' },
    { label: t('label.ORDER_CANCEL_RESTORE'), value: 'cancelled_restored' }
  ])

  const statusOptions = computed(() => filterOptions.value)

  // 🌟 MODIFIED: Intercept and filter the orders for God Mode!
  const orders = computed(() => {
    const allOrders = adminStore.adminData?.orders || []

    if (adminStore.impersonatedSellerId) {
      return allOrders.filter(order => {
        // Keep the order if ANY item inside it belongs to the impersonated seller
        return order.items?.some(item => {
          const itemSellerIdStr =
            typeof item.sellerId === 'object'
              ? item.sellerId._id?.toString()
              : item.sellerId?.toString()

          return itemSellerIdStr === adminStore.impersonatedSellerId
        })
      })
    }

    // NORMAL ADMIN MODE: Show everything
    return allOrders
  })

  const columns = computed(() => [
    {
      name: 'date',
      label: t('admin.ORDER_DATE'),
      align: 'left',
      field: row => date.formatDate(row.createdAt, 'DD/MM/YYYY HH:mm')
    },
    {
      name: 'id',
      label: t('admin.ORDER_ID'),
      align: 'left',
      field: row => row._id.substring(0, 8) + '...'
    },
    {
      name: 'customer',
      label: t('admin.ORDER_CUSTOMER'),
      align: 'left',
      field: row => `${row.contactInfo?.firstName || ''} ${row.contactInfo?.lastName || ''}`
    },
    { name: 'status', label: t('admin.ORDER_STATUS'), align: 'center', field: 'status' },
    { name: 'total', label: t('admin.ORDER_TOTAL'), align: 'right', field: 'totalAmount' },
    { name: 'actions', label: t('admin.ORDER_DETAILS'), align: 'center' }
  ])

  const hasChanges = computed(() => {
    return modifiedOrders.value && modifiedOrders.value.size > 0
  })

  // --- Dialog Computed Properties ---
  const showCountryField = computed(() => uiStore.ui[0]?.showCountry ?? false)

  const itemsSubtotal = computed(
    () => selectedOrder.value?.items?.reduce((a, b) => a + b.price * b.quantity, 0) || 0
  )

  const calculatedShipping = computed(
    () => (selectedOrder.value?.totalAmount || 0) - itemsSubtotal.value
  )

  // 🌟 Dynamic Game Logic Computations (Production Math: Hours)

  // 🛠️ DEV HACK: Make Admin UI "Hours" act like "Seconds"
  // const orderAgeHours = computed(() => {
  //   if (!activeOrder.value?.createdAt) return 0
  //   const createdTime = new Date(activeOrder.value.createdAt).getTime()
  //   const diffInSeconds = (currentTime.value - createdTime) / 1000 // 🌟 Hack applied
  //   return Math.max(0, Number(diffInSeconds.toFixed(1)))
  // })
  // 🛠️ DEV HACK

  // *** REAL LIFE ***
  const orderAgeHours = computed(() => {
    if (!activeOrder.value?.createdAt) return 0
    const createdTime = new Date(activeOrder.value.createdAt).getTime()

    // Calculates difference in actual hours
    const diffInHours = (currentTime.value - createdTime) / (1000 * 60 * 60)

    return Math.max(0, Number(diffInHours.toFixed(1)))
  })
  // *** REAL LIFE ***

  // 🌟 NEW: The Human-Readable UI Formatter
  const orderAgeFormatted = computed(() => {
    if (!activeOrder.value?.createdAt) return `0 ${t('label.MINS', 'MINS')}`

    const createdTime = new Date(activeOrder.value.createdAt).getTime()
    const diffInMs = Math.max(0, currentTime.value - createdTime)

    const totalMinutes = Math.floor(diffInMs / (1000 * 60))
    const days = Math.floor(totalMinutes / (60 * 24))
    const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
    const minutes = totalMinutes % 60

    const parts = []

    // If there are days, show Days and Hours (drop the minutes, they don't matter anymore)
    if (days > 0) {
      parts.push(`${days} ${t('label.DAYS', 'DAYS')}`)
      if (hours > 0) parts.push(`${hours} ${t('label.HOURS', 'HRS')}`)
    }
    // If there are no days, show Hours and Minutes
    else if (hours > 0) {
      parts.push(`${hours} ${t('label.HOURS', 'HRS')}`)
      if (minutes > 0) parts.push(`${minutes} ${t('label.MINS', 'MINS')}`)
    }
    // If there are no days and no hours, just show Minutes
    else {
      parts.push(`${minutes} ${t('label.MINS', 'MINS')}`)
    }

    if (parts.length === 0) return `0 ${t('label.MINS', 'MINS')}`

    return parts.join(' ')
  })

  const statusHint = computed(() => {
    if (pendingStatus.value === activeOrder.value?.status) {
      return {
        icon: 'info',
        color: 'grey-8',
        bgClass: 'bg-grey-2',
        title: t('label.HINT_CURRENT', 'Current Status'),
        desc: t(
          'label.HINT_CURRENT_DESC',
          'This order is currently in this state. Select a new status to proceed.'
        )
      }
    }

    switch (pendingStatus.value) {
      case 'confirmed': {
        const slaHours = targetUI.value.slaConfirmHours ?? 24
        const bonus = targetUI.value.scoreConfirmBonus ?? 2
        const confirmedOnTime = orderAgeHours.value <= slaHours

        return {
          icon: confirmedOnTime ? 'trending_up' : 'warning',
          color: confirmedOnTime ? 'positive' : 'warning',
          bgClass: confirmedOnTime ? 'bg-green-1' : 'bg-orange-1',
          title: confirmedOnTime
            ? t('label.HINT_CONFIRM_TITLE', `Bonus Unlocked: +${bonus} SR`, { bonus })
            : t('label.HINT_CONFIRM_LATE', 'SLA Missed: 0 SR'),
          desc: t(
            'label.HINT_CONFIRM_DESC',
            `Confirming within ${slaHours} hours boosts your Seller Trust Score and notifies the buyer.`,
            { hours: slaHours }
          )
        }
      }
      case 'shipped': {
        const slaHours = targetUI.value.slaShipHours ?? 48
        const bonus = targetUI.value.scoreShipBonus ?? 3
        const shippedOnTime = orderAgeHours.value <= slaHours

        return {
          icon: shippedOnTime ? 'trending_up' : 'warning',
          color: shippedOnTime ? 'positive' : 'warning',
          bgClass: shippedOnTime ? 'bg-green-1' : 'bg-orange-1',
          title: shippedOnTime
            ? t('label.HINT_SHIP_TITLE', `Bonus Unlocked: +${bonus} SR`, { bonus })
            : t('label.HINT_SHIP_LATE', 'SLA Missed: 0 SR'),
          desc: t(
            'label.HINT_SHIP_DESC',
            `Dispatching packages within ${slaHours} hours keeps your score high and buyers happy.`,
            { hours: slaHours }
          )
        }
      }
      case 'delivered': {
        // 🌟 ADDED BRACE
        const deliveryBase = targetUI.value.scoreDeliveryBase ?? 10
        return {
          icon: 'workspace_premium',
          color: 'primary',
          bgClass: 'bg-blue-1',
          title: t('label.HINT_DELIVER_TITLE', `Base Reward: +${deliveryBase} SR`, {
            bonus: deliveryBase
          }),
          desc: t(
            'label.HINT_DELIVER_DESC',
            'Finalizing this order permanently locks it, earns you the delivery reward, and applies the platform fee.'
          )
        }
      } // 🌟 ADDED BRACE
      case 'cancelled': {
        // 🌟 ADDED BRACE
        const cancelPenalty = targetUI.value.scoreCancelPenalty ?? 40
        return {
          icon: 'gavel',
          color: 'negative',
          bgClass: 'bg-red-1',
          title: t('label.HINT_CANCEL_TITLE', `Severe Penalty: -${cancelPenalty} SR`, {
            penalty: cancelPenalty
          }),
          desc: t(
            'label.HINT_CANCEL_DESC',
            'Canceling an order without restocking severely damages your score.'
          )
        }
      } // 🌟 ADDED BRACE
      case 'cancelled_restored': {
        // 🌟 ADDED BRACE
        const restockPenalty = targetUI.value.scoreRestockPenalty ?? 15
        return {
          icon: 'assignment_return',
          color: 'orange-9',
          bgClass: 'bg-orange-1',
          title: t('label.HINT_RESTOCK_TITLE', `Minor Penalty: -${restockPenalty} SR`, {
            penalty: restockPenalty
          }),
          desc: t(
            'label.HINT_RESTOCK_DESC',
            'Order returned and restocked. Applies a minor penalty for the failed delivery.'
          )
        }
      } // 🌟 ADDED BRACE
      default:
        return null
    }
  })

  // --- Actions ---

  const onRequest = async props => {
    const { page, rowsPerPage } = props.pagination
    loading.value = true
    try {
      await adminStore.fetchAdminOrders({
        page,
        limit: rowsPerPage,
        search: filter.value,
        statuses: filterStatuses.value,
        // 🌟 NEW: Pass the God Mode ID to the backend fetch!
        sellerId: adminStore.impersonatedSellerId || undefined
      })
    } catch (error) {
      console.error('Failed to fetch orders:', error)
    } finally {
      loading.value = false
    }
  }

  const refreshTable = () => {
    ordersPaging.value.page = 1
    onRequest({ pagination: ordersPaging.value })
  }

  // 🌟 NEW: Dialog Handlers
  const openStatusDialog = row => {
    currentTime.value = Date.now()
    activeOrder.value = row
    pendingStatus.value = row.status
    statusDialog.value = true
  }

  const confirmStatusChange = () => {
    if (pendingStatus.value === activeOrder.value?.status) {
      statusDialog.value = false
      return
    }

    // Update local table UI
    activeOrder.value.status = pendingStatus.value

    // Mark as dirty so the Save button illuminates
    if (typeof adminStore.markOrderAsModified === 'function') {
      adminStore.markOrderAsModified(activeOrder.value._id)
    }

    statusDialog.value = false
  }

  const saveLocal = async () => {
    if (!hasChanges.value) return
    loading.value = true
    try {
      await adminStore.saveData()
    } catch (error) {
      console.error('Failed to save order updates:', error)
    } finally {
      loading.value = false
    }
  }

  // --- Initial Load ---
  onMounted(() => {
    refreshTable()
  })

  // --- Formatting Helpers ---
  const getStatusColor = status => {
    const colors = {
      pending: 'warning',
      confirmed: 'info',
      shipped: 'primary',
      delivered: 'positive',
      cancelled: 'negative',
      cancelled_restored: 'deep-orange'
    }
    return colors[status] || 'grey'
  }

  const getStatusLabel = val => {
    const option = statusOptions.value.find(opt => opt.value === val)
    return option ? option.label : val
  }

  const openOrderDetails = order => {
    selectedOrder.value = order
    detailsDialog.value = true
  }

  const formatDate = val => date.formatDate(val, 'DD.MM.YYYY HH:mm')

  const formatPhone = phone => {
    if (!phone) return ''
    return phone.replace(/(\+\d{1,3})0/, '$1')
  }

  const formatCurrency = (amount, currencySymbol) => {
    if (amount === undefined || amount === null) return '0.00'
    const thisLocale = locale.value || 'en-US'
    const symbol = currencySymbol || ''
    try {
      return (
        new Intl.NumberFormat(thisLocale, { minimumFractionDigits: 2 }).format(amount) +
        ' ' +
        symbol
      )
    } catch {
      return Number(amount).toFixed(2) + ' ' + symbol
    }
  }
</script>

<style lang="scss" scoped>
  /* Ensure Sticky Header Works */
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

  .transition-colors {
    transition:
      background-color 0.3s ease,
      color 0.3s ease;
  }
</style>
