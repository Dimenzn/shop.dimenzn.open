<template>
  <q-card
    id="invoice-card"
    class="shipping-note-card full-width"
    flat
    bordered
    style="max-width: 100%; overflow: hidden"
  >
    <div class="row items-start q-pa-md bg-grey-1 relative-position">
      <div class="col-12 col-sm-6">
        <div class="text-h6 text-primary text-uppercase text-weight-bold">
          {{ companyName }}
        </div>
        <div class="text-caption text-grey-8">
          {{ $t('title.ORDER_CONFIRMATION') }}
        </div>
      </div>

      <div class="col-12 col-sm-6 text-sm-right q-mt-sm q-mt-sm-none">
        <div class="row justify-start justify-sm-end items-center q-gutter-x-sm q-mb-xs">
          <div class="text-subtitle1 text-weight-bold">
            {{ $t('label.ORDER_ID') }} <span class="text-primary">{{ order._id }}</span>
          </div>
          <q-badge :color="statusOrder.color" class="q-px-sm q-py-xs text-uppercase">
            {{ $t(statusOrder.info) }}
          </q-badge>
        </div>
        <div class="text-caption text-grey-8">
          {{ formatDate(order.createdAt) }}
        </div>
      </div>
    </div>

    <q-separator />

    <div class="row q-pa-md q-col-gutter-md">
      <!-- 🌟 1. SELLER DETAILS -->
      <div class="col-12 col-md-4">
        <div class="text-subtitle2 text-primary q-mb-xs">
          {{ $t('label.SOLD_BY', 'Sold By') }}
        </div>
        <div class="text-body2 text-grey-9">
          <div class="text-weight-bold">
            <q-icon
              v-if="storeInfo?.storeName"
              name="storefront"
              size="xs"
              class="q-mr-xs"
              color="primary"
            />
            {{ storeInfo ? storeInfo.storeName : companyName }}
          </div>

          <!-- 🌟 NEW: SOCIAL CONTACT ROW 🌟 -->
          <div v-if="storeInfo?.socials" class="row items-center q-gutter-x-sm q-mt-xs">
            <q-btn
              v-if="storeInfo.socials.email?.show && storeInfo.socials.email?.url"
              flat
              round
              dense
              size="sm"
              color="grey-8"
              icon="mail"
              type="a"
              :href="`mailto:${storeInfo.socials.email.url}`"
            />

            <q-btn
              v-if="storeInfo.socials.whatsapp?.show && storeInfo.socials.whatsapp?.url"
              flat
              round
              dense
              size="sm"
              color="green-14"
              icon="fab fa-whatsapp"
              type="a"
              :href="`https://wa.me/${cleanPhoneForLink(storeInfo.socials.whatsapp.url)}`"
              target="_blank"
            />
            <q-btn
              v-if="storeInfo.socials.viber?.show && storeInfo.socials.viber?.url"
              flat
              round
              dense
              size="sm"
              color="purple-13"
              icon="fab fa-viber"
              type="a"
              :href="`viber://chat?number=${cleanPhoneForLink(storeInfo.socials.viber.url)}`"
              target="_blank"
            />
            <q-btn
              v-if="storeInfo.socials.instagram?.show && storeInfo.socials.instagram?.url"
              flat
              round
              dense
              size="sm"
              color="pink-13"
              icon="fab fa-instagram"
              type="a"
              :href="storeInfo.socials.instagram.url"
              target="_blank"
            />

            <q-btn
              v-if="storeInfo.socials.facebook?.show && storeInfo.socials.facebook?.url"
              flat
              round
              dense
              size="sm"
              color="blue-8"
              icon="fab fa-facebook"
              type="a"
              :href="storeInfo.socials.facebook.url"
              target="_blank"
            />

            <q-btn
              v-if="storeInfo.socials.x?.show && storeInfo.socials.x?.url"
              flat
              round
              dense
              size="sm"
              color="black"
              icon="fab fa-x-twitter"
              type="a"
              :href="storeInfo.socials.x.url"
              target="_blank"
            />
          </div>

          <!-- Platform Fallback Text -->
          <div v-if="!storeInfo" class="text-caption text-grey-6 q-mt-xs">
            {{ $t('label.PLATFORM_FULFILLED', 'Official Platform Fulfill') }}
          </div>
        </div>
      </div>

      <!-- 2. CUSTOMER DETAILS -->
      <div class="col-12 col-sm-6 col-md-4">
        <div class="text-subtitle2 text-primary q-mb-xs">
          {{ $t('label.CUSTOMER_DETAILS') }}
        </div>
        <div class="text-body2 text-grey-9">
          <div class="text-weight-bold">
            {{ order.contactInfo?.firstName }} {{ order.contactInfo?.lastName }}
          </div>
          <div>{{ order.contactInfo?.email }}</div>
          <div>{{ formatPhone(order.contactInfo?.phone) }}</div>
        </div>
      </div>

      <!-- 3. SHIPPING TO (Right aligned on Desktop) -->
      <div class="col-12 col-sm-6 col-md-4 text-md-right">
        <div class="text-subtitle2 text-primary q-mb-xs">
          {{ $t('label.SHIPPING_TO') }}
        </div>
        <div class="text-body2 text-grey-9">
          <div>{{ order.shippingAddress?.address }}</div>
          <div>
            {{ order.shippingAddress?.city }},
            {{ order.shippingAddress?.postalCode }}
          </div>
          <div v-if="showCountryField" class="text-uppercase">
            {{ order.shippingAddress?.country }}
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
          <tr v-for="(item, index) in order.items" :key="index">
            <td class="text-left q-pl-md q-py-sm">
              <div class="row items-center no-wrap">
                <q-avatar rounded size="40px" class="q-mr-sm bg-grey-3">
                  <img v-if="item.image" :src="item.image" style="object-fit: cover" />
                  <q-icon v-else name="image_not_supported" color="grey" />
                </q-avatar>
                <div>
                  <div class="text-body2 text-weight-medium line-clamp-1">
                    {{ item.title }}
                  </div>
                  <div v-if="item.size" class="text-caption text-primary">
                    {{ $t('label.PROD_SIZE') }}: <strong>{{ item.size }}</strong>
                  </div>
                </div>
              </div>
            </td>
            <td class="text-right">{{ formatCurrency(item.price) }}</td>
            <td class="text-right">x{{ item.quantity }}</td>
            <td class="text-right text-weight-bold q-pr-md">
              {{ formatCurrency(item.price * item.quantity) }}
            </td>
          </tr>
        </tbody>
      </q-markup-table>
    </div>

    <q-separator />
    <div class="q-pa-none">
      <q-markup-table flat separator="horizontal" dense class="no-shadow"> </q-markup-table>
    </div>

    <q-slide-transition>
      <div v-if="order.digitalKey" class="q-pa-md">
        <div class="bg-blue-1 border-dashed-primary rounded-borders q-pa-lg text-center shadow-1">
          <div class="text-primary text-overline text-weight-bold q-mb-sm flex flex-center">
            <q-icon name="vpn_key" size="sm" class="q-mr-sm" />
            {{ $t('label.LABEL_ACTIVATION_KEY', 'Your Activation Key') }}
          </div>
          <div class="text-h4 text-weight-bolder text-dark" style="letter-spacing: 3px">
            {{ order.digitalKey }}
          </div>
          <div class="text-caption text-primary q-mt-sm">
            {{
              $t(
                'msgSystem.KEY_SAFE_BACKUP',
                'A backup of this key has also been sent to your email.'
              )
            }}
          </div>
        </div>
      </div>
    </q-slide-transition>

    <q-separator />

    <div class="row justify-end q-pa-md bg-grey-1">
      <div class="col-12 col-sm-6 col-md-4">
        <div class="row justify-between q-mb-sm text-caption">
          <span class="text-grey-8">{{ $t('label.PAY_METHOD_TITLE') }}:</span>
          <span class="text-weight-bold text-uppercase text-primary">
            {{
              order.paymentMethod === 'cod'
                ? $t('label.PAY_COD_TITLE')
                : order.paymentMethod === 'agreement'
                  ? $t('label.PAY_AGREEMENT_TITLE')
                  : $t('label.PAY_ONLINE')
            }}
          </span>
        </div>
        <q-separator class="q-my-sm" />
        <div class="row justify-between q-mb-xs text-body2">
          <span class="text-grey-8">{{ $t('label.PRICE_SUBTOTAL') }}:</span>
          <span>{{ formatCurrency(itemsSubtotal) }}</span>
        </div>

        <div class="row justify-between q-mb-sm text-body2">
          <span class="text-grey-8">{{ $t('label.PRICE_SHIPPING') }}:</span>
          <span>{{ formatCurrency(calculatedShipping) }}</span>
        </div>

        <div v-if="platformFee > 0" class="row justify-between q-mb-sm text-body2">
          <span class="text-grey-8"
            >{{ $t('label.PRICE_SERVICE_FEE', 'Service & Protection Fee') }}:</span
          >
          <span>{{ formatCurrency(platformFee) }}</span>
        </div>
        <q-separator color="primary" class="q-my-sm" />
        <div class="row justify-between text-h6 text-primary">
          <span class="text-weight-bold">{{ $t('label.PRICE_TOTAL') }}:</span>
          <span class="text-weight-bolder">
            {{ formatCurrency(order.totalAmount) }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="order.note" class="q-pa-md">
      <div class="bg-yellow-1 q-pa-sm rounded-borders text-body2 border-yellow">
        <span class="text-weight-bold text-orange-9">{{ $t('label.LBL_NOTE') }}:</span>
        {{ order.note }}
      </div>
    </div>
  </q-card>
</template>

<script setup>
  import { computed } from 'vue'
  import { date } from 'quasar'
  import { useUIStore } from 'stores/ui.store'
  import { useI18n } from 'vue-i18n'

  const { locale } = useI18n({ useScope: 'global' })

  const props = defineProps({
    order: {
      type: Object,
      required: true,
      default: () => ({})
    }
  })

  const uiStore = useUIStore()

  // 🚀 FIX: Added optional chaining to prevent fatal crashes if the store is empty
  const companyName = computed(() => uiStore.ui[0]?.companyName || '')
  const showCountryField = computed(() => uiStore.ui[0]?.showCountry ?? false)

  // 🌟 NEW: Extract Seller Info safely!
  const storeInfo = computed(() => {
    // Check if the backend explicitly attached the store profile to the order
    if (props.order.sellerData?.storeProfile?.storeName) {
      return props.order.sellerData.storeProfile
    }

    // Otherwise, check the first item in the order (since split orders group items by seller)
    const firstItem = props.order.items?.[0]
    if (firstItem?.sellerData?.storeProfile?.storeName) {
      return firstItem.sellerData.storeProfile
    }

    // Fallback: If no seller data is found, it returns null,
    // and the HTML template automatically displays the Platform's Company Name!
    return null
  })

  const itemsSubtotal = computed(() => {
    if (!props.order.items) return 0
    return props.order.items.reduce((acc, item) => acc + item.price * item.quantity, 0)
  })

  // 🌟 MODIFIED: Mapped to the exact field from your database!
  const platformFee = computed(() => {
    return props.order.platformFeeTotal || 0
  })

  // 🌟 MODIFIED: Subtract both subtotal and platform fee to get the true shipping cost
  const calculatedShipping = computed(() => {
    // Note: If your backend explicitly saves `order.shippingCost`, you should just return that!
    if (props.order.shippingCost !== undefined) {
      return props.order.shippingCost
    }

    // Otherwise, reverse-math it out of the total
    const total = props.order.totalAmount || 0
    const shipping = total - itemsSubtotal.value - platformFee.value

    // Prevent negative numbers caused by floating point math
    return shipping > 0 ? shipping : 0
  })

  // 🚀 FIX: Uncommented and activated the Status Order logic!
  const statusOrder = computed(() => {
    switch (props.order.status) {
      case 'pending':
        return { color: 'warning', info: 'label.ORDER_PENDING' }
      case 'confirmed':
        return { color: 'info', info: 'label.ORDER_CONFIRM' }
      case 'shipped':
        return { color: 'primary', info: 'label.ORDER_SHIP' }
      case 'delivered':
        return { color: 'positive', info: 'label.ORDER_DELIVER' }
      case 'cancelled':
      case 'cancelled_restored':
        return { color: 'negative', info: 'label.ORDER_CANCEL' }
      default:
        return { color: 'grey', info: 'label.ORDER_PENDING' }
    }
  })

  // --- HELPERS ---

  const formatPhone = phone => {
    if (!phone) return ''
    // 🚀 FIX: Ensure phone is treated as a string before running .replace
    return String(phone).replace(/(\+\d{1,3})0/, '$1')
  }

  // Helper to remove spaces, brackets, and plus signs for WhatsApp/Viber links
  const cleanPhoneForLink = phone => {
    if (!phone) return ''
    return String(phone).replace(/[^0-9]/g, '')
  }

  const formatDate = dateString => {
    if (!dateString) return ''
    return date.formatDate(dateString, 'DD.MM.YYYY HH:mm')
  }

  const formatCurrency = amount => {
    if (amount === undefined || amount === null) return '0.00'

    const thisLocale = locale.value || 'en-US'
    const symbol = props.order.currency || ''

    try {
      const formattedNumber = new Intl.NumberFormat(thisLocale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)

      return `${formattedNumber} ${symbol}`
    } catch {
      return amount.toFixed(2) + ' ' + symbol
    }
  }
</script>

<style lang="scss" scoped>
  .shipping-note-card {
    border-radius: 8px;
    overflow: hidden;
  }

  .line-clamp-1 {
    display: -webkit-box;
    -webkit-line-clamp: 1;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .border-yellow {
    border: 1px solid #ffe082;
  }
  .border-yellow {
    border: 1px solid #ffe082;
  }

  /* 🌟 NEW: For the Digital Key Box */
  .border-dashed-primary {
    border: 2px dashed var(--q-primary);
  }
</style>
