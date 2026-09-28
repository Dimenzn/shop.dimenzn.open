<template>
  <div class="product-vertical rounded-borders drop-shadow">
    <div class="row" v-if="isValidProduct">
      <div class="col-12 product-image-container relative-position flip-container">
        <div class="flipper" :class="{ 'is-flipped': isFlipped }">
          <div class="flip-front relative-position full-width full-height">
            <q-img
              class="product-image"
              :src="productData.locales[locale].images[0]"
              :error-src="imageError"
              :ratio="1"
            />
            <div v-if="isOutOfStock" class="absolute-top-right q-pa-xs" style="top: 20px">
              <q-badge color="grey-8" :label="$t('label.SOLD_OUT')" />
            </div>
          </div>

          <div class="flip-back relative-position full-width full-height">
            <q-img
              class="product-image"
              :src="productData.sellerId.storeProfile.storeLogo || baseLogo"
              :error-src="imageError"
              :ratio="1"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- <div v-else class="row q-pa-sm">
      <div class="col-12 product-image-container">
        <q-skeleton height="175px" square animation="fade" />
      </div>
    </div> -->

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
  import { computed, watch, ref, onMounted, onUnmounted } from 'vue'

  import { useI18n } from 'vue-i18n'
  import { useCartStore } from 'stores/cart.store'
  import { useNotifyStore } from 'stores/notify.store'
  import { useUIStore } from 'stores/ui.store'
  import imageError from 'src/assets/no.image.1.1.png'
  import baseLogo from 'src/assets/base.logo.png'
  import { useDialogOffset } from 'src/composables/useDialogOffset'

  const props = defineProps({
    product: { type: Object, default: null }
  })

  // --- Stores & Composables ---

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

  // --- Formatting and Logic ---
  const hasDiscount = computed(() => {
    if (!isValidProduct.value) return false
    return (
      productData.value.discountPrice &&
      productData.value.discountPrice > 0 &&
      productData.value.discountPrice < productData.value.price
    )
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

  const isOutOfStock = computed(() => {
    if (!isValidProduct.value) return true
    const sizes = currentSizes.value
    if (sizes && sizes.length > 0) {
      return !sizes.some(s => s.qty > 0)
    }
    return (productData.value.quantity || 0) <= 0
  })

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
    } catch (error) {
      console.error('Quick add failed', error)
    }
  }

  // --- Automated Animation State ---
  const isFlipped = ref(false)
  let randomTimer = null
  let revealTimer = null

  // 🌟 Helper function to get a random time between a min and max (in milliseconds)
  const getRandomDelay = (min = 5000, max = 15000) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
  }

  // 🌟 The core infinite loop function
  const scheduleNextFlip = () => {
    // Pick a random time (e.g., between 5 and 15 seconds)
    const nextDelay = getRandomDelay(5000, 120000)

    randomTimer = setTimeout(() => {
      // 1. Flip to show the seller
      isFlipped.value = true

      // 2. Wait exactly 2.5 seconds while showing the seller
      revealTimer = setTimeout(() => {
        // 3. Flip back to the product image
        isFlipped.value = false

        // 4. Schedule the NEXT random flip! (This creates the infinite loop)
        scheduleNextFlip()
      }, 2500) // Hold for 2.5 seconds
    }, nextDelay)
  }

  // --- Lifecycle Hooks ---
  onMounted(() => {
    // Start the infinite loop as soon as the component loads
    scheduleNextFlip()
  })

  onUnmounted(() => {
    // 🛑 CRITICAL: Destroy the timers if the user leaves the page
    // so they don't keep running in the background and crash the browser!
    if (randomTimer) clearTimeout(randomTimer)
    if (revealTimer) clearTimeout(revealTimer)
  })
</script>

<style lang="scss" scoped>
  /* Keep your styles exactly the same! */
  .product-vertical {
    min-width: 120px;
    max-width: 120px;
    cursor: pointer;
  }
  .product-image-container {
    overflow: hidden;
    border-radius: 8px;
    background: #f5f5f5;
    width: 100%;
    aspect-ratio: 1 / 1;
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
  .drop-shadow {
    filter: drop-shadow(0px 5px 5px rgba(0, 0, 0, 0.3));
  }

  /* ==========================================
     🌟 3D VERTICAL FLIP CARD PHYSICS
  ========================================== */
  .flip-container {
    perspective: 1000px;
  }

  .flipper {
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
    position: relative;
    width: 100%;
    height: 100%;
  }

  /* The actual vertical flip mechanism */
  .flipper.is-flipped {
    transform: rotateX(180deg);
  }

  .flip-front,
  .flip-back {
    backface-visibility: hidden;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border-radius: 8px; /* Match the product-image-container radius */
    overflow: hidden;
  }

  .flip-front {
    z-index: 2;
    transform: rotateX(0deg);
  }

  .flip-back {
    transform: rotateX(180deg);
    /* Adding a subtle inner shadow to make it feel inset */
    box-shadow: inset 0 0 15px rgba(0, 0, 0, 0.5);
  }
</style>
