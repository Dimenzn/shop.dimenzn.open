<template>
  <div class="stripe-container rounded-borders">
    <div v-if="loading" class="row justify-center q-pa-md">
      <q-spinner color="primary" size="2em" />
    </div>

    <div id="setup-element" :class="{ hidden: loading }"></div>

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

  // 🌟 REFACTORED: Extracted 't' for translations
  const { locale, t } = useI18n({ useScope: 'global' })
  const emit = defineEmits(['setup-success', 'setup-error'])

  const props = defineProps({
    email: { type: String, default: '' }
  })

  // --- State ---
  const loading = ref(true)
  const errorMessage = ref('')

  let stripe = null
  let elements = null

  // --- Localization Logic ---
  let stripeLocale = locale.value ? locale.value.split('-')[0] : 'auto'
  if (stripeLocale === 'sr') stripeLocale = 'hr'

  onMounted(async () => {
    try {
      // 1. Initialize Stripe
      stripe = await loadStripe(marketConfig.stripePublicKey)

      // 2. Fetch the Setup Client Secret from the backend
      const response = await api.post('/auth/seller/setup-intent')
      const clientSecret = response.data.clientSecret

      // 3. Configure and mount Stripe Elements
      elements = stripe.elements({
        clientSecret,
        appearance: { theme: 'stripe' },
        locale: stripeLocale
      })

      const setupElementOptions = {
        defaultValues: {
          billingDetails: {
            email: props.email
          }
        }
      }

      const setupElement = elements.create('payment', setupElementOptions)
      setupElement.mount('#setup-element')

      setupElement.on('ready', () => {
        loading.value = false
      })
    } catch (error) {
      console.error('Error loading Stripe Setup:', error)
      // 🌟 REFACTORED: Localized init error
      errorMessage.value = t('seller.BILLING_INIT_ERR', 'Failed to load secure billing system.')
      loading.value = false
    }
  })

  // --- Main Action ---
  const submitSetup = async () => {
    if (!stripe || !elements) {
      emit('setup-error')
      return
    }

    errorMessage.value = ''

    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/panel?tab=billing`
        },
        redirect: 'if_required'
      })

      if (error) {
        // We leave this alone because Stripe automatically translates it!
        errorMessage.value = error.message
        emit('setup-error')
      } else if (setupIntent && setupIntent.status === 'succeeded') {
        emit('setup-success', setupIntent.payment_method)
      }
    } catch (err) {
      console.error('Stripe Setup Error:', err)
      // 🌟 REFACTORED: Localized fallback error
      errorMessage.value = t('seller.BILLING_ERR', 'An unexpected error occurred.')
      emit('setup-error')
    }
  }

  defineExpose({
    submitSetup
  })
</script>

<style scoped>
  .hidden {
    display: none;
  }
  .stripe-container {
    min-height: 100px;
  }
</style>
