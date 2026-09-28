<template>
  <div class="product-vertical rounded-borders">
    <div class="row" v-if="isValidProduct">
      <div class="col-12 product-image-container relative-position">
        <q-img
          class="product-image"
          :src="productData.locales[locale].images[0]"
          :error-src="imageError"
          :ratio="1"
        />

        <div v-if="isOutOfStock" class="absolute-top-right q-pa-xs">
          <q-badge color="grey-8" :label="$t('label.SOLD_OUT')" />
        </div>

        <div v-else-if="hasDiscount" class="absolute-top-left q-pa-xs">
          <q-badge color="negative" class="shadow-2"> -{{ discountPercentage }}% </q-badge>
        </div>
      </div>

      <div class="col-12">
        <q-card-section class="q-pa-sm">
          <div class="text-caption text-grey-8 q-mb-xs title-truncate">
            {{ productData.locales[locale].title }}
          </div>

          <div class="text-caption q-mb-xs title-truncate" v-if="sellerName">
            <q-chip
              clickable
              flat
              dense
              size="sm"
              :color="sellerRank.bgColor"
              :text-color="sellerRank.textColor"
              :icon="sellerRank.icon"
              @click.stop="goToSeller"
            >
              {{ sellerName }}
            </q-chip>
          </div>

          <div class="q-py-xs row justify-between items-center">
            <q-rating
              readonly
              :model-value="productData.rating"
              size="0.9em"
              :max="5"
              color="primary"
            />

            <q-btn
              square
              size="sm"
              flat
              color="primary"
              :icon="isPlatformService ? 'bolt' : 'add_shopping_cart'"
              @click.stop="quickAddToCart"
              :disable="isOutOfStock"
            />
          </div>

          <div class="row items-baseline wrap">
            <div v-if="hasDiscount" class="text-caption text-strike text-grey-6 q-mr-sm">
              {{ formattedPrice }}
            </div>

            <div
              class="text-subtitle1"
              :class="hasDiscount ? 'text-negative text-weight-bold' : 'text-primary'"
            >
              {{ hasDiscount ? formattedDiscountPrice : formattedPrice }}
              <span class="text-caption text-grey-8">{{ currency }}</span>
            </div>
          </div>
        </q-card-section>
      </div>
    </div>

    <div v-else class="row">
      <div class="col-12 product-image-container">
        <q-skeleton height="175px" square animation="fade" />
      </div>
      <div class="col-12">
        <q-card-section class="q-pa-sm">
          <q-skeleton type="text" width="90%" class="q-mb-xs" animation="fade" />
          <q-skeleton type="text" width="60%" class="q-mb-sm" animation="fade" />
          <div class="row justify-between items-center q-mb-xs">
            <q-skeleton type="text" width="40%" animation="fade" />
            <q-skeleton type="circle" size="24px" animation="fade" />
          </div>
          <q-skeleton type="rect" width="30%" height="20px" animation="fade" />
        </q-card-section>
      </div>
    </div>

    <q-dialog
      v-model="sizeDialog"
      position="bottom"
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card
        class="box-theme-card q-pb-md q-mx-sm q-mb-sm"
        :style="[{ width: '100%', maxWidth: '450px' }, offsetStyle]"
      >
        <q-card-section class="row items-center no-wrap q-py-sm bg-grey-2">
          <div class="text-subtitle1 text-primary text-weight-bold text-uppercase letter-spacing-1">
            {{ $t('title.PROD_SELECT_SIZE') }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup color="primary" />
        </q-card-section>

        <q-card-section class="q-pa-md" v-if="isValidProduct">
          <div class="row no-wrap items-center product-preview-box q-pa-sm border-accent">
            <div class="col-auto q-mr-md">
              <q-img
                :src="productData.locales[locale].images[0]"
                :error-src="imageError"
                style="height: 60px; width: 60px"
                class="rounded-borders theme-border"
                fit="cover"
              />
            </div>

            <div class="col overflow-hidden">
              <div class="text-caption text-grey-8 q-mb-xs title-truncate">
                {{ productData.locales[locale].title }}
              </div>

              <div class="row items-baseline q-mt-xs">
                <span v-if="hasDiscount" class="text-caption text-strike text-grey-6 q-mr-sm">
                  {{ formattedPrice }}
                </span>
                <q-badge
                  :color="hasDiscount ? 'negative' : 'primary'"
                  class="text-weight-bold q-px-sm"
                  outline
                >
                  {{ hasDiscount ? formattedDiscountPrice : formattedPrice }} {{ currency }}
                </q-badge>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="q-pt-none q-px-md">
          <div class="text-overline text-grey-7 q-mb-sm">{{ $t('label.PROD_AVAIL_SIZES') }}</div>

          <div class="row q-col-gutter-sm justify-start">
            <div class="col-auto" v-for="(sizeObj, index) in currentSizes" :key="index">
              <q-btn
                :label="sizeObj.size"
                :disable="sizeObj.qty <= 0"
                unelevated
                rounded
                outline
                color="primary"
                @click="confirmSizeSelection(sizeObj.size, index)"
              >
                <q-tooltip v-if="sizeObj.qty <= 0">
                  {{ $t('label.OUT_OF_STOCK') }}
                </q-tooltip>
              </q-btn>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
  import { useQuasar } from 'quasar'
  import { computed, watch, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useCartStore } from 'stores/cart.store'
  import { useNotifyStore } from 'stores/notify.store'
  import { useUIStore } from 'stores/ui.store'
  import imageError from 'src/assets/no.image.1.1.png'
  import { useDialogOffset } from 'src/composables/useDialogOffset'

  const $q = useQuasar()
  const props = defineProps({
    product: { type: Object, default: null }
  })

  // --- Stores & Composables ---
  const authStore = useAuthStore()
  const router = useRouter()
  const uiStore = useUIStore()
  const cartStore = useCartStore()
  const notifyStore = useNotifyStore()
  const { locale, t } = useI18n({ useScope: 'global' })

  const { offsetStyle } = useDialogOffset(computed(() => uiStore.ui[0]?.leftDrawerOpen || false))

  // --- State ---
  const productData = ref(props.product || {})
  const sizeDialog = ref(false)
  const selectedSizeIndex = ref(null)

  // --- Watchers ---
  watch(
    () => props.product,
    newVal => {
      productData.value = newVal || {}
    },
    { deep: true }
  )

  // --- Computed ---
  const currency = computed(() => uiStore.ui[0]?.currency || '')

  const isValidProduct = computed(() => {
    return productData.value && productData.value.locales && productData.value.locales[locale.value]
  })

  // 🌟 NEW: Detect Platform Service
  const isPlatformService = computed(() => {
    if (!isValidProduct.value) return false
    return productData.value.isPlatformService === true
  })

  // 🌟 KEPT ORIGINAL LOGIC
  const sellerName = computed(() => {
    return productData.value?.sellerId?.storeProfile?.storeName || null
  })

  const sellerId = computed(() => {
    return productData.value?.sellerId?._id || productData.value?.seller || null
  })

  // 🌟 REFACTORED: Intercept Platform to apply Purple styling
  const sellerRank = computed(() => {
    // 1. Platform Guard
    if (isPlatformService.value) {
      return {
        name: 'Platform',
        //bgColor: '',
        textColor: 'primary',
        icon: 'verified'
      }
    }

    // 2. Normal Sellers
    const score = productData.value?.sellerId?.storeProfile?.trustScore ?? 1500
    if (score < 1500) {
      return {
        name: t('seller.RANK_BRONZE', 'Bronze'),
        bgColor: 'brown-1',
        textColor: 'brown-8',
        icon: 'gavel'
      }
    }
    if (score < 2500) {
      return {
        name: t('seller.RANK_SILVER', 'Silver'),
        bgColor: 'blue-grey-1',
        textColor: 'blue-grey-7',
        icon: 'shield'
      }
    }
    if (score < 3500) {
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
  })

  // --- Formatting and Logic ---
  const hasDiscount = computed(() => {
    if (!isValidProduct.value) return false
    return (
      productData.value.discountPrice &&
      productData.value.discountPrice > 0 &&
      productData.value.discountPrice < productData.value.price
    )
  })

  const discountPercentage = computed(() => {
    if (!hasDiscount.value) return 0
    const discount = 100 - (productData.value.discountPrice / productData.value.price) * 100
    return Math.round(discount)
  })

  const formattedPrice = computed(() => {
    try {
      if (!isValidProduct.value) return ''
      return new Intl.NumberFormat([locale.value]).format(productData.value.price)
    } catch {
      return 'n/a'
    }
  })

  const formattedDiscountPrice = computed(() => {
    try {
      if (!isValidProduct.value) return ''
      return new Intl.NumberFormat([locale.value]).format(productData.value.discountPrice)
    } catch {
      return 'n/a'
    }
  })

  const currentSizes = computed(() => {
    if (!isValidProduct.value) return []
    return productData.value.sizes || []
  })

  // 🌟 KEPT ORIGINAL LOGIC
  const isOutOfStock = computed(() => {
    if (!isValidProduct.value) return true
    const sizes = currentSizes.value
    if (sizes && sizes.length > 0) {
      return !sizes.some(s => s.qty > 0)
    }
    return (productData.value.quantity || 0) <= 0
  })

  // --- Actions ---
  const goToSeller = () => {
    if (sellerId.value) {
      router.push(`/seller/${sellerId.value}`)
    }
  }

  const bypassToStripeCheckout = async () => {
    // 🌟 NEW GUARD: Google Play Policy Compliance for Digital Goods
    if ($q.platform.is.capacitor) {
      notifyStore.notify(
        403,
        t(
          'msgSystem.ERR_BUY_DIGITAL_WEB_ONLY',
          'Digital Keys can only be purchased on our website at dimenzn.com due to mobile app policies.'
        )
      )
      return
    }

    // 🌟 Require login for digital platform keys
    if (!authStore.isAuthenticated) {
      notifyStore.notify(
        403,
        t('msgSystem.ERR_LOGIN_TO_BUY', 'You must be logged in to purchase digital keys.')
      )
      // 🌟 FIX: Actually send them to the login page!
      router.push({ name: 'login' })
      return
    }

    // 🌟 Prevent active sellers/admins from buying unnecessary keys
    const userRole = authStore.userProfile?.role || 'member'
    if (['seller', 'admin', 'platform'].includes(userRole)) {
      notifyStore.notify(
        400,
        t('msgSystem.ERR_ALREADY_UPGRADED', 'Your account is already fully upgraded!')
      )
      return
    }

    console.log('⚡ Bypassing Cart - Sending to Express Checkout:', productData.value.id)

    // 🌟 THE FIX: Route them directly to the new Express Container, passing the product ID
    router.push({ name: 'checkout-digital', params: { id: productData.value.id } })
  }

  const quickAddToCart = async () => {
    if (isPlatformService.value) {
      return await bypassToStripeCheckout()
    }
    const sizes = currentSizes.value
    if (sizes && sizes.length > 0) {
      selectedSizeIndex.value = null
      sizeDialog.value = true
      return
    }
    await addToCartFinal(null)
  }

  const confirmSizeSelection = async (sizeString, index) => {
    selectedSizeIndex.value = index
    await addToCartFinal(sizeString)
    sizeDialog.value = false
  }

  const addToCartFinal = async sizeString => {
    const alreadyInCart = cartStore.cart?.items?.some(
      item => item.productId === productData.value.id && item.size === sizeString
    )

    if (alreadyInCart) {
      notifyStore.notify(200, t('msgSystem.CART_ALREADY_ADDED'))
      return
    }

    try {
      await cartStore.addToCart(productData.value.id, sizeString)
    } catch {
      console.error('Quick add failed')
    }
  }
</script>

<style lang="scss" scoped>
  /* Keep your styles exactly the same! */
  .product-vertical {
    min-width: 175px;
    max-width: 175px;
    cursor: pointer;
    &:hover .product-image {
      transform: scale(1.05);
    }
  }
  .product-image-container {
    overflow: hidden;
    border-radius: 8px;
    background: #f5f5f5;
    width: 100%;
    aspect-ratio: 1 / 1;
  }
  .product-image {
    transition:
      transform 0.3s ease,
      opacity 0.3s ease;
    transform-origin: center center;
  }
  .title-truncate {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    line-height: 1.3;
    min-height: 2.6em;
  }
  .q-card__section {
    padding-top: 8px;
    padding-bottom: 8px;
  }
  .box-theme-card {
    border: 1px solid var(--q-primary);
    border-radius: 21px !important;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    background: white;
  }
  .product-preview-box {
    background: var(--q-grey-2);
    border: 1px dashed var(--q-primary);
    border-radius: 12px;
  }
  .theme-border {
    border: 1px solid #ddd;
    border-radius: 8px;
  }
  .letter-spacing-1 {
    letter-spacing: 1px;
  }
</style>
