<template>
  <q-form ref="checkoutForm" @submit.prevent="BuyProcess" class="row q-col-gutter-lg q-pb-md">
    <div class="col-xs-12 col-md-8">
      <q-card flat bordered class="q-pa-md q-mb-md rounded-borders">
        <div class="text-h6 q-mb-md text-primary">{{ $t('label.CHECKOUT_SHIPPING_TITLE') }}</div>
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
          <div class="col-12 col-lg-6">
            <q-input
              outlined
              dense
              v-model="formData.email"
              :label="$t('label.FIELD_EMAIL')"
              type="email"
              :rules="[
                val => !!val || $t('label.VAL_REQUIRED'),
                val => /.+@.+\..+/.test(val) || $t('label.VAL_EMAIL_INVALID')
              ]"
            />
          </div>
          <div class="col-12 col-lg-6">
            <div class="row q-col-gutter-sm">
              <div class="col-4 col-sm-4 col-md-3">
                <q-select
                  outlined
                  dense
                  v-model="phonePrefix"
                  :options="filteredPhoneCodes"
                  option-value="value"
                  option-label="value"
                  emit-value
                  map-options
                  :label="$t('label.FIELD_CODE')"
                  :disable="!showCountryField"
                  behavior="menu"
                  :rules="[val => !!val || $t('label.FIELD_CODE')]"
                  hide-bottom-space
                >
                  <template v-slot:option="scope">
                    <q-item v-bind="scope.itemProps">
                      <q-item-section>
                        <q-item-label>{{ scope.opt.label }}</q-item-label>
                        <q-item-label caption>{{ scope.opt.value }}</q-item-label>
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
              <div class="col-8 col-sm-8 col-md-9">
                <q-input
                  outlined
                  dense
                  v-model="formData.phone"
                  :label="$t('label.FIELD_PHONE')"
                  mask="phone"
                  unmasked-value
                  :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
                />
              </div>
            </div>
          </div>
          <div class="col-12">
            <q-input
              outlined
              dense
              v-model="formData.address"
              :label="$t('label.FIELD_ADDRESS')"
              :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              outlined
              dense
              v-model="formData.city"
              :label="$t('label.FIELD_CITY')"
              :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-input
              outlined
              dense
              v-model="formData.postalCode"
              :label="$t('label.FIELD_POSTAL_CODE')"
              :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
            />
          </div>
          <div class="col-12 col-sm-6">
            <q-select
              :disable="!showCountryField"
              outlined
              dense
              v-model="formData.country"
              :label="$t('label.FIELD_COUNTRY')"
              :options="allowedCountryOptions"
              :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
            />
          </div>
          <div class="col-12">
            <q-input
              outlined
              dense
              v-model="formData.note"
              :label="$t('label.FIELD_ORDER_NOTE')"
              type="textarea"
              rows="2"
            />
          </div>
          <div class="col-12 q-py-sm" v-if="authStore.isAuthenticated">
            <q-checkbox v-model="saveInfo" :label="$t('label.FIELD_SAVE_INFO')" color="primary" />
          </div>
        </div>
      </q-card>

      <q-card flat bordered class="q-pa-md q-mb-md rounded-borders">
        <div class="text-h6 q-mb-md text-primary">{{ $t('label.PAY_METHOD_TITLE') }}</div>

        <div v-if="!cod && !cia && !poa" class="q-pa-md bg-red-1 text-red rounded-borders">
          {{ $t('msgSystem.PAYMENT_NONE') }}
        </div>

        <q-list v-else bordered separator class="rounded-borders">
          <q-item
            v-if="cod"
            tag="label"
            v-ripple
            :active="formData.paymentMethod === 'cod'"
            active-class="bg-blue-1"
          >
            <q-item-section avatar>
              <q-radio v-model="formData.paymentMethod" val="cod" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('label.PAY_COD_TITLE') }}</q-item-label>
              <q-item-label caption>{{ $t('label.PAY_COD_DESC') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="payments" size="2em" color="grey-7" />
            </q-item-section>
          </q-item>

          <q-item
            v-if="cia"
            tag="label"
            v-ripple
            :active="formData.paymentMethod === 'stripe'"
            active-class="bg-blue-1"
          >
            <q-item-section avatar>
              <q-radio v-model="formData.paymentMethod" val="stripe" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('label.PAY_CARD_TITLE') }}</q-item-label>
              <q-item-label caption>{{ $t('label.PAY_CARD_DESC') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="credit_card" size="2em" color="grey-7" />
            </q-item-section>
          </q-item>

          <q-slide-transition>
            <div
              v-if="formData.paymentMethod === 'stripe' && formData.email"
              class="q-pa-md bg-blue-1"
            >
              <StripePayment
                ref="stripeRef"
                :items="items"
                :amount="total + shipping + platformFee"
                :currency="currency"
                :email="formData.email"
                @payment-success="handleStripeSuccess"
                @payment-error="handleStripeError"
              />
            </div>

            <div
              v-else-if="formData.paymentMethod === 'stripe' && !formData.email"
              class="q-pa-md text-center text-grey-8"
            >
              <q-icon name="mail" size="2em" class="q-mb-sm text-primary" /><br />
              {{
                $t(
                  'msgSystem.ENTER_EMAIL_FIRST',
                  'Please enter your email address above to load the secure payment form.'
                )
              }}
            </div>
          </q-slide-transition>

          <q-item
            v-if="poa"
            tag="label"
            v-ripple
            :active="formData.paymentMethod === 'agreement'"
            active-class="bg-blue-1"
          >
            <q-item-section avatar>
              <q-radio v-model="formData.paymentMethod" val="agreement" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label>{{ $t('label.PAY_AGREEMENT_TITLE') }}</q-item-label>
              <q-item-label caption>{{ $t('label.PAY_AGREEMENT_DESC') }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="handshake" size="2em" color="grey-7" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <q-expansion-item
        class="bg-white rounded-borders"
        style="border: 1px solid var(--q-grey-4)"
        icon="shopping_bag"
        :label="$t('label.CHECKOUT_REVIEW_ITEMS') + ` (${items.length})`"
        header-class="bg-grey-1 text-primary text-weight-medium"
        expand-icon-class="text-primary"
        default-opened
      >
        <div class="q-pa-md">
          <div class="q-mb-sm" v-for="(value, index) in items" :key="index">
            <q-card flat bordered class="row full-width overflow-hidden rounded-borders">
              <div class="col-xs-12 col-sm-8">
                <div class="row full-height items-center q-pa-sm no-wrap">
                  <div class="col-auto q-pr-sm">
                    <q-img
                      :src="value.product.image"
                      style="width: 40px; height: 40px"
                      class="rounded-borders"
                    />
                  </div>
                  <div class="col text-dark text-weight-regular">
                    <div class="text-subtitle2 line-height-small">
                      <span v-if="value.size" class="text-bold text-primary"
                        >{{ value.size }} - </span
                      >{{ value.product.title }}
                    </div>
                  </div>
                </div>
              </div>
              <div class="col-xs-12 col-sm-4 bg-grey-1 q-pa-sm">
                <div class="row full-height justify-between items-center">
                  <div class="col-auto">
                    <span class="text-subtitle2 text-grey-8 q-mr-sm">x{{ value.quantity }}</span>
                  </div>
                  <div class="col-auto">
                    <span
                      :class="
                        getEffectivePrice(value.product) < value.product.price
                          ? 'text-negative'
                          : 'text-primary'
                      "
                      class="text-subtitle1 text-weight-bold"
                    >
                      {{ formattedPrice(getEffectivePrice(value.product) * value.quantity) }}
                      <span class="text-caption text-grey-8">{{ currency }}</span>
                    </span>
                  </div>
                </div>
              </div>
            </q-card>
          </div>
        </div>
      </q-expansion-item>
    </div>

    <div class="col-xs-12 col-md-4">
      <div style="position: sticky; top: 0">
        <q-card flat bordered class="bg-grey-1 q-pa-md rounded-borders">
          <div class="text-h6 text-primary q-mb-md">{{ $t('label.PRICE_TOTAL') }}</div>
          <q-separator class="q-mb-md" />

          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle1 text-grey-8">{{ $t('label.PRICE_SUBTOTAL') }}</div>
            <div class="text-subtitle1 text-dark text-weight-medium">
              {{ formattedPrice(total) }}
              <span class="text-caption text-grey-8">{{ currency }}</span>
            </div>
          </div>

          <div class="row justify-between items-center q-mb-sm">
            <div class="text-subtitle1 text-grey-8">{{ $t('label.PRICE_SHIPPING') }}</div>
            <div class="text-subtitle1 text-dark text-weight-medium">
              {{ formattedPrice(shipping) }}
              <span class="text-caption text-grey-8">{{ currency }}</span>
            </div>
          </div>

          <div v-if="platformFee > 0" class="row justify-between items-center q-mb-md">
            <div class="text-subtitle1 text-grey-8 flex items-center">
              {{ $t('label.PRICE_SERVICE_FEE', 'Service & Protection Fee') }}
              <q-icon name="info" color="grey-5" class="q-ml-xs cursor-pointer">
                <q-tooltip class="bg-dark text-body2">
                  {{
                    $t(
                      'label.SERVICE_FEE_DESC',
                      'This fee helps us run the platform and provide 24/7 support.'
                    )
                  }}
                </q-tooltip>
              </q-icon>
            </div>
            <div class="text-subtitle1 text-dark text-weight-medium">
              {{ formattedPrice(platformFee) }}
              <span class="text-caption text-grey-8">{{ currency }}</span>
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <div class="row justify-between items-end q-mb-lg">
            <div class="col-12 text-right text-primary text-h4 text-bold">
              {{ formattedPrice(total + shipping + platformFee) }}
              <span class="text-subtitle1">{{ currency }}</span>
            </div>
          </div>

          <q-btn
            rounded
            class="full-width"
            size="lg"
            color="primary"
            :label="$t('label.BTN_PLACE_ORDER')"
            type="submit"
            :loading="isCheckingOut"
            :disable="!formData.paymentMethod"
            unelevated
          />
        </q-card>
      </div>
    </div>
  </q-form>
</template>

<script setup>
  import { computed, ref, reactive, onMounted, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'

  // --- Components ---
  import StripePayment from 'components/stripe/StripePayment.vue'

  // --- Stores ---
  import { useCartStore } from 'src/stores/cart.store'
  import { useNotifyStore } from 'src/stores/notify.store'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useUIStore } from 'stores/ui.store'
  import { usePRStore } from 'src/stores/products.store'

  // --- Utils ---
  import api from 'src/utils/api'
  import phoneCodes from 'src/utils/phoneCodes'

  // ==============================================================================
  // Initialization & Store Setup
  // ==============================================================================
  const { locale, t } = useI18n({ useScope: 'global' })
  const router = useRouter()

  const uiStore = useUIStore()
  const cartStore = useCartStore()
  const notifyStore = useNotifyStore()
  const authStore = useAuthStore()
  const productStore = usePRStore()

  defineProps({
    items: { type: Array, required: true },
    total: { type: Number, required: true }
  })

  // ==============================================================================
  // State Management
  // ==============================================================================
  const checkoutForm = ref(null)
  const stripeRef = ref(null)
  const pendingOrderId = ref(null)

  const isCheckingOut = ref(false)
  const saveInfo = ref(true)
  const phonePrefix = ref('')

  const formData = reactive({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
    note: '',
    paymentMethod: null
  })

  // ==============================================================================
  // Computed Properties (UI Configuration & Validation)
  // ==============================================================================

  // 🌟 NEW: Pull the platform fee right from the Pinia store math!
  const platformFee = computed(() => cartStore.cartPlatformFee || 0)

  const shipping = computed(() => {
    const sellerGroups = {}
    const cartItems = cartStore.detailedCart || []

    cartItems.forEach(item => {
      if (!item.product) return

      const product = item.product

      // 🌟 FIX 1: Safely extract the ID string whether it is a raw string OR a populated Mongoose object
      let sellerIdStr = 'platform'
      if (product.sellerId) {
        sellerIdStr =
          typeof product.sellerId === 'object'
            ? product.sellerId._id?.toString()
            : product.sellerId.toString()
      }

      if (!sellerGroups[sellerIdStr]) {
        let groupFee = 0

        if (sellerIdStr === 'platform') {
          groupFee = uiStore.ui[0]?.shippingCost || 0
        } else {
          // 🌟 FIX 2: Check for the store profile wherever the backend decided to hide it!
          const sellerProfile = product.sellerId?.storeProfile || product.sellerData?.storeProfile
          const shippingPref = sellerProfile?.shipping

          if (shippingPref) {
            groupFee = shippingPref.isFree === true ? 0 : shippingPref.flatRate || 0
          } else {
            groupFee = 0
          }
        }

        sellerGroups[sellerIdStr] = groupFee
      }
    })

    return Object.values(sellerGroups).reduce((sum, fee) => sum + fee, 0)
  })

  const currency = computed(() => uiStore.ui[0]?.currency || '')

  const cod = computed(() => uiStore.ui[0]?.paymentCod ?? false)
  const cia = computed(() => uiStore.ui[0]?.paymentCia ?? false)
  const poa = computed(() => uiStore.ui[0]?.paymentPoa ?? false)

  const showCountryField = computed(() => uiStore.ui[0]?.showCountry ?? false)
  const defaultCountry = computed(() => uiStore.ui[0]?.defaultCountry || 'United States')

  const allowedCountryOptions = computed(() => {
    const list = [...(uiStore.ui[0]?.allowedCountries || [])]
    const def = defaultCountry.value
    if (def && !list.includes(def)) list.push(def)
    return list.sort()
  })

  const filteredPhoneCodes = computed(() => {
    const allowed = allowedCountryOptions.value
    return phoneCodes.filter(code => allowed.includes(code.label))
  })

  const defaultPhonePrefix = computed(() => {
    const match = phoneCodes.find(c => c.label === defaultCountry.value)
    return match ? match.value : '+1'
  })

  // ==============================================================================
  // Watchers & Lifecycle Hooks
  // ==============================================================================
  watch(
    [cod, cia, poa],
    ([newCod, newCia, newPoa]) => {
      const current = formData.paymentMethod
      if (current === 'cod' && newCod) return
      if (current === 'stripe' && newCia) return
      if (current === 'agreement' && newPoa) return

      if (newCod) formData.paymentMethod = 'cod'
      else if (newCia) formData.paymentMethod = 'stripe'
      else if (newPoa) formData.paymentMethod = 'agreement'
      else formData.paymentMethod = null
    },
    { immediate: true }
  )

  onMounted(() => {
    prefillUserProfile()
  })
  cartStore.loadCartDetails(true)
  // ==============================================================================
  // Helper Methods
  // ==============================================================================
  function prefillUserProfile() {
    if (!authStore.isAuthenticated) {
      if (!showCountryField.value) {
        phonePrefix.value = defaultPhonePrefix.value
        formData.country = defaultCountry.value
      } else {
        phonePrefix.value = ''
        formData.country = ''
      }
      return
    }

    if (authStore.userProfile) {
      formData.firstName = authStore.userProfile.firstName || ''
      formData.lastName = authStore.userProfile.lastName || ''
      formData.email = authStore.userProfile.email || ''

      const storedAddress = authStore.userProfile.shippingAddress || {}
      formData.address = storedAddress.address || ''
      formData.city = storedAddress.city || ''
      formData.postalCode = storedAddress.postalCode || ''

      const storedCountry = storedAddress.country || ''
      if (showCountryField.value) {
        formData.country = allowedCountryOptions.value.includes(storedCountry) ? storedCountry : ''
      } else {
        formData.country = defaultCountry.value
      }

      const fullPhone = authStore.userProfile.phone || ''
      const detectedPrefixObj = phoneCodes.find(p => fullPhone.startsWith(p.value))

      if (showCountryField.value) {
        if (detectedPrefixObj && allowedCountryOptions.value.includes(detectedPrefixObj.label)) {
          phonePrefix.value = detectedPrefixObj.value
        } else {
          phonePrefix.value = ''
        }
      } else {
        phonePrefix.value = defaultPhonePrefix.value
      }

      if (detectedPrefixObj) {
        formData.phone = fullPhone.replace(detectedPrefixObj.value, '')
      } else {
        formData.phone = fullPhone
      }
    }
  }

  function getEffectivePrice(product) {
    if (product.discountPrice > 0 && product.discountPrice < product.price) {
      return product.discountPrice
    }
    return product.price
  }

  function formattedPrice(price) {
    if (typeof price !== 'number') return 'n/a'
    try {
      return new Intl.NumberFormat([locale.value]).format(price)
    } catch {
      return 'n/a'
    }
  }

  // ==============================================================================
  // Core Checkout & Validation Flow
  // ==============================================================================
  async function BuyProcess() {
    const isValid = await checkoutForm.value.validate()

    if (!isValid) {
      notifyStore.notify(400, t('msgSystem.VAL_REQ_FIELDS'))
      return
    }
    if (showCountryField.value && !phonePrefix.value) {
      notifyStore.notify(400, t('label.VAL_REQUIRED'))
      return
    }
    if (!formData.paymentMethod) {
      notifyStore.notify(400, t('label.PAY_METHOD_REQ'))
      return
    }

    isCheckingOut.value = true

    try {
      const oldTotal = cartStore.cartTotal
      await cartStore.loadCartDetails(true)

      if (oldTotal !== cartStore.cartTotal) {
        notifyStore.notify(400, t('msgSystem.PRICE_CHANGED_REVIEW'))
        isCheckingOut.value = false
        return
      }

      const isStockVerified = await cartStore.verifyCartStock()
      if (!isStockVerified) {
        isCheckingOut.value = false
        return
      }

      if (formData.paymentMethod === 'stripe') {
        if (stripeRef.value && stripeRef.value.intentId) {
          const generatedOrderId = await finalizeOrder(stripeRef.value.intentId, true)

          if (!generatedOrderId) {
            console.error('❌ Draft creation failed to return an orderId.')
            notifyStore.notify(500, t('msgSystem.GEN_UNEXPECTED'))
            isCheckingOut.value = false
            return
          }

          pendingOrderId.value = generatedOrderId
          await stripeRef.value.submitPayment()
        } else {
          notifyStore.notify(500, 'Payment system not fully loaded.')
          isCheckingOut.value = false
        }
        return
      }

      await finalizeOrder()
    } catch (error) {
      console.error('Checkout Initialization Error:', error)
      isCheckingOut.value = false
    }
  }

  // ==============================================================================
  // Database Submission & Routing
  // ==============================================================================
  async function finalizeOrder(transactionId = null, isDraft = false) {
    try {
      const finalPhone = phonePrefix.value
        ? `${phonePrefix.value}${formData.phone}`
        : formData.phone
      const finalCountry = showCountryField.value ? formData.country : defaultCountry.value

      const orderPayload = {
        contactInfo: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: finalPhone
        },
        shippingAddress: {
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          country: finalCountry
        },
        paymentMethod: formData.paymentMethod,
        note: formData.note,
        currency: currency.value,
        cartId: cartStore.guestCartId,
        locale: locale.value,
        transactionId: typeof transactionId === 'string' ? transactionId : null
      }

      if (authStore.isAuthenticated && saveInfo.value) {
        await authStore.updateUserProfile({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: finalPhone,
          shippingAddress: { ...orderPayload.shippingAddress }
        })
      }

      const result = await cartStore.createOrder(orderPayload)

      if (result && (result.success || result.orderId)) {
        if (isDraft || result.isDraft) {
          return result.orderId
        }

        cartStore.clearCart()
        productStore.fetchProducts().catch(() => {})

        if (result.url) {
          window.location.href = result.url
          return
        }

        router.push({ name: 'order', params: { id: 'confirmed' } })
      } else {
        console.error('Backend failed to return an orderId:', result)
      }
    } catch (error) {
      console.error('Finalize Order Error:', error)
    } finally {
      if (!isDraft) {
        isCheckingOut.value = false
      }
    }
  }

  // ==============================================================================
  // Stripe Event Handlers
  // ==============================================================================
  async function handleStripeSuccess() {
    cartStore.clearCart()
    const orderId = pendingOrderId.value

    if (orderId) {
      let webhookFinished = false
      let attempts = 0
      const maxAttempts = 15

      while (!webhookFinished && attempts < maxAttempts) {
        try {
          const response = await api.get(`/open/order/${orderId}?polling=true`)
          if (response.data && response.data.isPaid === true) {
            webhookFinished = true
          }
        } catch (error) {
          console.warn('Polling order status...', error)
        }

        if (!webhookFinished) {
          attempts++
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    isCheckingOut.value = false
    notifyStore.notify(200, t('msgSystem.ORDER_SUCCESS'))
    router.push({ name: 'order', params: { id: 'confirmed' } })
  }

  function handleStripeError() {
    isCheckingOut.value = false
  }
</script>

<style lang="scss" scoped>
  .line-height-small {
    line-height: 1.2;
  }
</style>
