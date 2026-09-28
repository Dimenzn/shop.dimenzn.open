<template>
  <div class="stripe-container rounded-borders">
    <div v-if="loading" class="row justify-center q-pa-md">
      <q-spinner color="primary" size="2em" />
    </div>

    <div id="payment-element" :class="{ hidden: loading }"></div>

    <q-slide-transition>
      <div
        v-if="allowSaveBilling && canSave && !loading"
        class="q-mt-md q-pa-sm bg-blue-1 rounded-borders border-blue row items-center"
      >
        <q-icon name="info" color="primary" size="sm" class="q-mr-sm" />
        <div class="text-caption text-dark text-weight-medium">
          {{
            $t(
              'seller.BILLING_AUTO_SAVE_INFO',
              'By entering a card, it will be securely saved to seamlessly handle future platform fees.'
            )
          }}
        </div>
      </div>
    </q-slide-transition>

    <div v-if="errorMessage" class="text-negative q-mt-sm text-weight-bold">
      <q-icon name="error" size="sm" class="q-mr-xs" />
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { loadStripe } from '@stripe/stripe-js'
  import api from 'src/utils/api'
  import { marketConfig } from 'boot/runtime-config'

  const { locale, t } = useI18n({ useScope: 'global' })
  const emit = defineEmits(['payment-success', 'payment-error'])

  const props = defineProps({
    amount: { type: Number, required: true },
    currency: { type: String, default: 'usd' },
    email: { type: String, default: '' },
    items: { type: Array, required: true },
    allowSaveBilling: { type: Boolean, default: false }
  })

  const loading = ref(true)
  const errorMessage = ref('')
  const intentId = ref(null)

  const canSave = ref(props.allowSaveBilling)

  let stripe = null
  let elements = null
  let clientSecretRef = ''
  let isProcessing = false // The Double-Click Lock

  let stripeLocale = locale.value ? locale.value.split('-')[0] : 'auto'
  if (stripeLocale === 'sr') stripeLocale = 'hr'

  onMounted(async () => {
    try {
      stripe = await loadStripe(marketConfig.stripePublicKey)
      const response = await api.post('/open/order/payment', {
        items: props.items,
        currency: props.currency,
        email: props.email
      })

      clientSecretRef = response.data.clientSecret
      intentId.value = response.data.intentId

      elements = stripe.elements({
        clientSecret: clientSecretRef,
        appearance: { theme: 'stripe' },
        locale: stripeLocale
      })

      const paymentElementOptions = {
        defaultValues: { billingDetails: { email: props.email } }
      }

      const paymentElement = elements.create('payment', paymentElementOptions)
      paymentElement.mount('#payment-element')

      paymentElement.on('change', event => {
        if (props.allowSaveBilling) {
          canSave.value = event.value.type !== 'promptpay'
        }
      })

      paymentElement.on('ready', () => {
        loading.value = false
      })
    } catch {
      errorMessage.value = t('msgSystem.PAYMENT_INIT_ERR', 'Failed to load payment system.')
      loading.value = false
    }
  })

  const submitPayment = async () => {
    if (isProcessing) return
    if (!stripe || !elements) return emit('payment-error')

    isProcessing = true
    errorMessage.value = ''

    try {
      // 🌟 THE FIX: Validate the form before confirming!
      const { error: submitError } = await elements.submit()
      if (submitError) {
        errorMessage.value = submitError.message
        isProcessing = false
        return emit('payment-error')
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret: clientSecretRef,
        confirmParams: {
          return_url: window.location.origin + window.location.pathname
        },
        redirect: 'if_required'
      })

      if (error) {
        errorMessage.value = error.message
        isProcessing = false
        emit('payment-error')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        isProcessing = false
        // Instantly resolves card payments without a redirect
        emit('payment-success', paymentIntent.id)
      }
    } catch {
      errorMessage.value = t('msgSystem.PAYMENT_ERR', 'An unexpected error occurred.')
      isProcessing = false
      emit('payment-error')
    }
  }

  defineExpose({ submitPayment, intentId })
</script>

<style scoped>
  .hidden {
    display: none;
  }
  .stripe-container {
    min-height: 100px;
  }
  .border-blue {
    border: 1px solid var(--q-blue-4);
  }
</style>
