<template>
  <q-form ref="checkoutForm" @submit.prevent="BuyProcess" class="row q-col-gutter-lg q-pb-md">
    <div class="col-xs-12 col-md-8">
      <q-card flat bordered class="q-pa-md q-mb-md rounded-borders">
        <div class="text-h6 q-mb-md text-primary">
          {{ $t('label.CHECKOUT_BILLING_TITLE', 'Billing Details') }}
        </div>
        <div class="row q-col-gutter-sm">
          <div class="col-12 col-sm-6">
            <q-input
              outlined
              dense
              v-model="formData.firstName"
              :label="$t('label.FIELD_FIRST_NAME')"
              :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              outlined
              dense
              v-model="formData.lastName"
              :label="$t('label.FIELD_LAST_NAME')"
              :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
            />
          </div>
          <div class="col-12">
            <q-input
              outlined
              dense
              v-model="formData.email"
              :label="$t('label.FIELD_EMAIL')"
              type="email"
              readonly
              :hint="$t('label.DIGITAL_KEY_INFO')"
              :rules="[
                val => !!val || $t('label.VAL_REQUIRED'),
                val => /.+@.+\..+/.test(val) || $t('label.VAL_EMAIL_INVALID')
              ]"
            />
          </div>
        </div>
      </q-card>

      <q-card flat bordered class="q-pa-md q-mb-md rounded-borders">
        <div class="text-h6 q-mb-md text-primary">
          <q-icon name="lock" class="q-mr-sm" />
          {{ $t('label.SECURE_PAYMENT', 'Secure Card Payment') }}
        </div>

        <div class="q-pa-md bg-blue-1 rounded-borders">
          <StripePayment
            v-if="formData.email"
            ref="stripeRef"
            :items="stripeFormattedItem"
            :amount="totalPrice"
            :currency="currency"
            :email="formData.email"
            :allow-save-billing="true"
            @payment-success="handleStripeSuccess"
            @payment-error="handleStripeError"
          />
        </div>
      </q-card>
    </div>

    <div class="col-xs-12 col-md-4">
      <div style="position: sticky; top: 0">
        <q-card flat bordered class="bg-grey-1 q-pa-md rounded-borders">
          <div class="text-h6 text-primary q-mb-md">
            {{ $t('label.ORDER_SUMMARY', 'Order Summary') }}
          </div>

          <div class="row items-center q-mb-md no-wrap">
            <div class="col-auto q-pr-sm">
              <q-img
                :src="product.locales[locale]?.images[0]"
                style="width: 50px; height: 50px"
                class="rounded-borders border-grey"
              />
            </div>
            <div class="col text-dark text-weight-medium line-height-small">
              {{ product.locales[locale]?.title }}
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle1 text-grey-8">{{ $t('label.PRICE_SUBTOTAL') }}</div>
            <div class="text-subtitle1 text-dark text-weight-medium">
              {{ formattedPrice(totalPrice) }}
              <span class="text-caption text-grey-8">{{ currency }}</span>
            </div>
          </div>

          <div class="row justify-between items-center q-mb-md">
            <div class="text-subtitle1 text-grey-8">{{ $t('label.PRICE_SHIPPING') }}</div>
            <div class="text-subtitle1 text-positive text-weight-bold">
              {{ $t('label.DIGITAL_DELIVERY', 'Digital Delivery') }}
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <div class="row justify-between items-end q-mb-lg">
            <div class="col-12 text-right text-primary text-h4 text-bold">
              {{ formattedPrice(totalPrice) }}
              <span class="text-subtitle1">{{ currency }}</span>
            </div>
          </div>

          <q-btn
            rounded
            class="full-width"
            size="lg"
            color="primary"
            :label="$t('label.BTN_PAY_NOW', 'Pay Now')"
            type="submit"
            :loading="isCheckingOut"
            icon="bolt"
            unelevated
          />
        </q-card>
      </div>
    </div>
  </q-form>
</template>

<script setup>
  import { computed, ref, reactive, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'

  import StripePayment from 'components/stripe/StripePayment.vue'

  import { useNotifyStore } from 'src/stores/notify.store'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useUIStore } from 'stores/ui.store'
  import api from 'src/utils/api'

  const { locale, t } = useI18n({ useScope: 'global' })
  const router = useRouter()

  const uiStore = useUIStore()
  const notifyStore = useNotifyStore()
  const authStore = useAuthStore()

  const props = defineProps({
    product: { type: Object, required: true }
  })

  // --- State ---
  const checkoutForm = ref(null)
  const stripeRef = ref(null)
  const pendingOrderId = ref(null)
  const isCheckingOut = ref(false)

  const formData = reactive({
    firstName: '',
    lastName: '',
    email: ''
  })

  // --- Computed ---
  const currency = computed(() => uiStore.ui[0]?.currency || '')

  const totalPrice = computed(() => {
    if (props.product.discountPrice > 0 && props.product.discountPrice < props.product.price) {
      return props.product.discountPrice
    }
    return props.product.price
  })

  const stripeFormattedItem = computed(() => {
    return [
      {
        productId: props.product.id,
        quantity: 1,
        size: t('label.DIGITAL_SIZE', 'Digital'),
        product: props.product
      }
    ]
  })

  onMounted(() => {
    // 🌟 PURE AND CLEAN: No more URL hacking or local storage listeners!
    if (authStore.userProfile) {
      formData.firstName = authStore.userProfile.firstName || ''
      formData.lastName = authStore.userProfile.lastName || ''
      formData.email = authStore.userProfile.email || ''
    }
  })

  // --- Helpers ---
  function formattedPrice(price) {
    if (typeof price !== 'number') return 'n/a'
    try {
      return new Intl.NumberFormat([locale.value]).format(price)
    } catch {
      return 'n/a'
    }
  }

  // --- Core Flow ---
  async function BuyProcess() {
    const isValid = await checkoutForm.value.validate()

    if (!isValid) {
      notifyStore.notify(400, t('msgSystem.VAL_REQ_FIELDS'))
      return
    }

    isCheckingOut.value = true

    try {
      if (stripeRef.value && stripeRef.value.intentId) {
        const generatedOrderId = await finalizeDigitalOrder(stripeRef.value.intentId, true)

        if (!generatedOrderId) {
          isCheckingOut.value = false
          return
        }

        pendingOrderId.value = generatedOrderId
        await stripeRef.value.submitPayment() // Trigger Stripe
      } else {
        notifyStore.notify(500, t('msgSystem.PAYMENT_INIT_ERR'))
        isCheckingOut.value = false
      }
    } catch (error) {
      console.error('Checkout Error:', error)
      isCheckingOut.value = false
    }
  }

  // --- Database Submission ---
  async function finalizeDigitalOrder(transactionId = null) {
    try {
      const orderPayload = {
        contactInfo: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: 'N/A'
        },
        shippingAddress: {
          address: t('label.DIGITAL_DELIVERY', 'Digital Delivery'),
          city: t('label.DIGITAL_DELIVERY', 'Digital Delivery'),
          postalCode: '00000',
          country: 'N/A'
        },
        items: [
          {
            productId: props.product.id,
            sellerId: props.product.sellerId,
            title:
              props.product.locales[locale.value]?.title ||
              t('label.DIGITAL_SERVICE', 'Digital Service'),
            price: totalPrice.value,
            quantity: 1,
            platformFee: 0,
            image: props.product.locales[locale.value]?.images[0] || '',
            size: t('label.DIGITAL_SIZE', 'Digital')
          }
        ],
        paymentMethod: 'stripe',
        currency: currency.value,
        locale: locale.value,
        transactionId: transactionId,
        isDigital: true
      }

      const response = await api.post('/auth/orders/express-digital', orderPayload)

      if (response.data && response.data.orderId) {
        return response.data.orderId
      }
      return null
    } catch (error) {
      console.error('Finalize Digital Order Error:', error)
      return null
    }
  }

  // --- Stripe Event Handlers ---
  async function handleStripeSuccess() {
    const orderId = pendingOrderId.value
    let fetchedKey = null

    if (orderId) {
      let webhookFinished = false
      let attempts = 0

      // Pure polling loop to wait for the backend to generate the key
      while (!webhookFinished && attempts < 15) {
        try {
          const response = await api.get(`/auth/orders/${orderId}/status`)
          if (response.data && response.data.isPaid === true) {
            webhookFinished = true
            fetchedKey = response.data.digitalKey
          }
        } catch {
          console.warn('Polling for webhook confirmation...')
        }

        if (!webhookFinished) {
          attempts++
          await new Promise(resolve => setTimeout(resolve, 1500))
        }
      }
    }

    isCheckingOut.value = false
    pendingOrderId.value = null

    if (fetchedKey) {
      // Trigger the Fancy Box!
      router.push({ query: { autoUpgradeKey: fetchedKey } })
    } else {
      // Fallback if the webhook is unusually slow
      notifyStore.notify(
        200,
        t(
          'msgSystem.DIGITAL_PURCHASE_SUCCESS',
          'Payment successful! Please check your email for your activation key.'
        )
      )
      window.location.href = '/'
    }
  }

  function handleStripeError() {
    isCheckingOut.value = false
  }
</script>

<style lang="scss" scoped>
  .line-height-small {
    line-height: 1.2;
  }
  .border-grey {
    border: 1px solid var(--q-grey-4);
  }
</style>
