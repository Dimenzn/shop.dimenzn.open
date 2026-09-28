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
          {{ $t('seller.HEADER_BILLING', 'Billing & Platform Fees') }}
        </div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md">
        <div class="row justify-center q-pb-xl q-pt-md">
          <div class="col-12" style="max-width: 550px">
            <div v-if="isLoadingData" class="text-center q-pa-xl">
              <q-spinner color="primary" size="3em" />
            </div>

            <template v-else>
              <q-card
                v-if="isRestricted && feesOwed > 0"
                flat
                bordered
                class="rounded-borders overflow-hidden bg-red-1 border-left-red q-mb-lg"
              >
                <div class="q-pa-md">
                  <div class="row items-center justify-between no-wrap q-mb-sm">
                    <div class="row items-center no-wrap">
                      <q-icon name="warning" size="sm" color="negative" class="q-mr-sm" />
                      <div class="text-subtitle1 text-weight-bold text-negative">
                        {{
                          $t('seller.BILLING_ACTION_REQUIRED', 'Action Required: Store Restricted')
                        }}
                      </div>
                    </div>
                    <div class="text-weight-bold text-negative text-h6">
                      {{ formatPrice(feesOwed) }}
                    </div>
                  </div>

                  <div class="text-caption text-dark q-mb-md">
                    {{
                      $t(
                        'seller.BILLING_RESTRICTED_DESC',
                        'Your store is currently hidden because of unpaid platform fees. Settle the outstanding balance below to instantly unlock your store.'
                      )
                    }}
                  </div>

                  <div class="bg-white q-pa-md rounded-borders border-grey">
                    <StripeFeePayment
                      ref="stripeFeeRef"
                      :email="userEmail"
                      @payment-success="onFeeSuccess"
                      @payment-error="onFeeError"
                    />

                    <q-btn
                      outline
                      color="negative"
                      icon="qr_code_scanner"
                      :label="$t('seller.BTN_PAY_NOW', 'Pay Now & Unlock')"
                      class="full-width q-mt-md text-weight-bold"
                      size="md"
                      :loading="isPayingFee"
                      @click="submitFeePayment"
                    />
                  </div>
                </div>
              </q-card>

              <div v-else>
                <div class="row items-center no-wrap q-mb-sm">
                  <q-icon name="shield" size="sm" color="primary" class="q-mr-sm" />
                  <div class="text-subtitle1 text-weight-bold text-dark">
                    {{ $t('seller.BILLING_SETUP_TITLE', 'Auto-Pay Settings') }}
                  </div>
                </div>
                <div class="text-caption text-grey-8 q-mb-lg">
                  {{
                    $t(
                      'seller.BILLING_DESC',
                      'Tired of manual payments? Securely save a card here, and we will automatically handle your platform fees every month so your store never gets restricted.'
                    )
                  }}
                </div>

                <q-card
                  v-if="savedCard"
                  flat
                  bordered
                  class="rounded-borders overflow-hidden bg-grey-1"
                >
                  <div class="q-pa-md">
                    <div class="row items-center justify-between no-wrap">
                      <div class="row items-center no-wrap">
                        <q-icon name="credit_card" size="xl" color="primary" class="q-mr-md" />
                        <div>
                          <div class="text-subtitle1 text-weight-bold text-capitalize">
                            {{ savedCard.brand }} **** {{ savedCard.last4 }}
                          </div>
                          <div class="text-caption text-grey-7">
                            {{ $t('seller.BILLING_EXPIRES', 'Expires') }}
                            {{ savedCard.expMonth }}/{{ savedCard.expYear }}
                          </div>
                        </div>
                      </div>

                      <q-btn
                        flat
                        round
                        color="grey-6"
                        icon="delete"
                        @click="confirmRemoveCard"
                        :loading="isRemoving"
                        :disable="isPayingFee"
                      >
                        <q-tooltip class="bg-dark">{{
                          $t('seller.BTN_REMOVE_CARD', 'Remove Card')
                        }}</q-tooltip>
                      </q-btn>
                    </div>
                  </div>
                </q-card>

                <q-form v-else @submit.prevent="handleSaveCard">
                  <StripeSetup
                    ref="stripeSetupRef"
                    :email="userEmail"
                    @setup-success="onSetupSuccess"
                    @setup-error="onSetupError"
                  />

                  <q-btn
                    unelevated
                    outline
                    color="primary"
                    class="full-width q-mt-md"
                    size="md"
                    :label="$t('seller.BTN_SAVE_CARD', 'Save Billing Card')"
                    type="submit"
                    :loading="isSaving"
                    icon="lock"
                  />
                </q-form>
              </div>
            </template>
          </div>
        </div>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useUIStore } from 'src/stores/ui.store'
  import { useQuasar } from 'quasar'
  import { useI18n } from 'vue-i18n'
  import api from 'src/utils/api'

  import StripeSetup from 'components/stripe/StripeSetup.vue'
  import StripeFeePayment from 'components/stripe/StripeFeePayment.vue'

  import { useNotifyStore } from 'src/stores/notify.store'

  const { t } = useI18n({ useScope: 'global' })
  const authStore = useAuthStore()
  const uiStore = useUIStore()
  const $q = useQuasar()
  const notifyStore = useNotifyStore()

  // --- State ---
  const isLoadingData = ref(true)
  const isSaving = ref(false)
  const isRemoving = ref(false)
  const isPayingFee = ref(false)

  const stripeSetupRef = ref(null)
  const stripeFeeRef = ref(null)
  const savedCard = ref(null)

  // --- Computed Auth Data ---
  const userEmail = computed(() => authStore.userProfile?.email || '')
  const storeProfile = computed(() => authStore.userProfile?.storeProfile || {})
  const isRestricted = computed(() => storeProfile.value.billingStatus === 'restricted')
  const feesOwed = computed(() => storeProfile.value.platformFeesOwed || 0)
  const targetCurrency = computed(() => uiStore.ui[0]?.currency || 'USD')

  const formatPrice = val => {
    if (!val) return '0.00'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: targetCurrency.value.toUpperCase()
    }).format(val)
  }

  onMounted(async () => {
    await fetchCardStatus()
  })

  const fetchCardStatus = async () => {
    isLoadingData.value = true
    try {
      const response = await api.get('/auth/seller/billing-card')
      if (response.data.hasCard) {
        savedCard.value = response.data
      } else {
        savedCard.value = null
      }
    } catch (error) {
      console.error('Failed to fetch card:', error)
    } finally {
      isLoadingData.value = false
    }
  }

  // --- SECURE CARD SETUP LOGIC ---
  const handleSaveCard = async () => {
    isSaving.value = true
    await stripeSetupRef.value.submitSetup()
  }

  const onSetupSuccess = async () => {
    isSaving.value = false
    try {
      const response = await api.post('/auth/seller/verify-card')
      if (authStore.userProfile?.storeProfile) {
        authStore.userProfile.storeProfile.billingStatus = response.data.billingStatus
        if (response.data.billingStatus === 'active') {
          authStore.userProfile.storeProfile.billingLockReason = ''
        }
      }
      await fetchCardStatus()
      window.dispatchEvent(new Event('billing-updated'))
    } catch (error) {
      console.error('Failed to verify new card with backend', error)
    }
  }

  const onSetupError = () => {
    isSaving.value = false
  }

  const confirmRemoveCard = () => {
    $q.dialog({
      title: t('seller.DIALOG_REMOVE_CARD_TITLE', 'Remove Billing Card'),
      message: t(
        'seller.DIALOG_REMOVE_CARD_DESC',
        'Are you sure you want to remove your saved payment method?'
      ),
      cancel: true,
      persistent: true,
      color: 'negative'
    }).onOk(async () => {
      isRemoving.value = true
      try {
        const response = await api.delete('/auth/seller/billing-card')
        savedCard.value = null

        if (authStore.userProfile?.storeProfile) {
          authStore.userProfile.storeProfile.billingStatus = response.data.billingStatus
          if (response.data.billingStatus === 'active') {
            authStore.userProfile.storeProfile.billingLockReason = ''
          }
        }

        window.dispatchEvent(new Event('billing-updated'))
      } catch (error) {
        console.error('Failed to remove card:', error)
      } finally {
        isRemoving.value = false
      }
    })
  }

  // --- 💸 EMBEDDED FEE PAYMENT LOGIC ---
  const submitFeePayment = async () => {
    isPayingFee.value = true
    await stripeFeeRef.value.submitPayment()
  }

  const onFeeSuccess = async () => {
    isPayingFee.value = false

    // 🌟 FAST OPTIMISTIC UPDATE
    if (authStore.userProfile?.storeProfile) {
      authStore.userProfile.storeProfile.platformFeesOwed = 0
      authStore.userProfile.storeProfile.billingStatus = 'active'
      authStore.userProfile.storeProfile.billingLockReason = ''
    }

    notifyStore.notify(
      200,
      t('seller.MSG_FEE_PAID_SUCCESS', 'Platform fee paid successfully! Your store is now active.')
    )

    window.dispatchEvent(new Event('billing-updated'))

    // Refresh the card status so the UI immediately shows the card that was just saved!
    await fetchCardStatus()
  }

  const onFeeError = () => {
    isPayingFee.value = false
  }
</script>

<style lang="scss" scoped>
  .border-left-red {
    border-left: 4px solid $negative !important;
  }
  .border-grey {
    border: 1px solid var(--q-grey-4);
  }
</style>
