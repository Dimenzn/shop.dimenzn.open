<template>
  <div class="stripe-container rounded-borders">
    <div v-if="loading" class="row justify-center q-pa-md">
      <q-spinner color="primary" size="2em" />
    </div>

    <div id="fee-payment-element" :class="{ hidden: loading }"></div>

    <q-slide-transition>
      <div
        v-if="canSave && !loading"
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
    email: { type: String, default: '' }
  })

  const loading = ref(true)
  const errorMessage = ref('')
  const canSave = ref(true)

  let stripe = null
  let elements = null
  let isProcessing = false // Prevents the user from actually double-clicking

  let stripeLocale = locale.value ? locale.value.split('-')[0] : 'auto'
  if (stripeLocale === 'sr') stripeLocale = 'hr'

  onMounted(async () => {
    try {
      stripe = await loadStripe(marketConfig.stripePublicKey)
      const response = await api.post('/auth/seller/checkout-fee')

      elements = stripe.elements({
        clientSecret: response.data.clientSecret,
        appearance: { theme: 'stripe' },
        locale: stripeLocale
      })

      const paymentElementOptions = {
        defaultValues: { billingDetails: { email: props.email } }
      }

      const paymentElement = elements.create('payment', paymentElementOptions)
      paymentElement.mount('#fee-payment-element')

      paymentElement.on('change', event => {
        canSave.value = event.value.type !== 'promptpay'
      })

      paymentElement.on('ready', () => {
        loading.value = false
      })
    } catch (error) {
      if (error.response?.data?.message === 'ERR_NO_FEES_TO_SETTLE') {
        loading.value = false
        emit('payment-success')
        return
      }
      console.error('Error loading Stripe Fee Payment:', error)
      errorMessage.value = t('msgSystem.PAYMENT_INIT_ERR', 'Failed to load payment system.')
      loading.value = false
    }
  })

  const submitPayment = async () => {
    // 🌟 THE LOCK: Prevents the user from mashing the button
    if (isProcessing) return
    if (!stripe || !elements) return emit('payment-error')

    isProcessing = true
    errorMessage.value = ''

    try {
      // 🌟 THE FIX: We ONLY use confirmPayment.
      // Stripe will automatically validate, sync, and pop the PromptPay modal natively
      // without firing duplicate API requests!
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + window.location.pathname + '?tab=billing'
        },
        redirect: 'if_required'
      })

      if (error) {
        errorMessage.value = error.message
        isProcessing = false
        emit('payment-error')
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // This instantly resolves Card payments without a redirect
        isProcessing = false
        emit('payment-success', paymentIntent.id)
      }
    } catch (err) {
      console.error('Stripe Confirmation Error:', err)
      errorMessage.value = t('msgSystem.PAYMENT_ERR', 'An unexpected error occurred.')
      isProcessing = false
      emit('payment-error')
    }
  }

  defineExpose({ submitPayment })
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
