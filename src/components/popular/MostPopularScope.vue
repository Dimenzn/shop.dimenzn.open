<template>
  <div class="product-horizontal rounded-borders">
    <div class="row" v-if="isValidProduct">
      <div class="col-12 product-image-container relative-position">
        <q-img
          class="product-image"
          :src="activeLocaleData.images?.[0] || imageError"
          :error-src="imageError"
          :ratio="1"
        />
        <div v-if="isOutOfStock" class="absolute-top-right q-pa-xs" style="z-index: 2">
          <q-badge color="negative" :label="$t('label.SOLD_OUT') || 'Sold Out'" />
        </div>
      </div>

      <div class="col-12">
        <q-card-section class="q-pa-sm">
          <div class="row items-baseline wrap">
            <div
              class="text-subtitle1"
              :class="hasDiscount ? 'text-negative text-weight-bold' : 'text-primary'"
            >
              {{ hasDiscount ? formattedDiscountPrice : formattedPrice }}
              <span class="text-caption text-grey-8">{{ currency }}</span>
            </div>
          </div>
          <div class="q-py-xs">
            <q-rating
              readonly
              :model-value="product.rating || 0"
              size="1em"
              :max="5"
              color="primary"
            />
          </div>
        </q-card-section>
      </div>
    </div>

    <div class="row" v-else>
      <div class="col-12 product-image-container">
        <q-skeleton height="200px" square animation="fade" />
      </div>

      <div class="col-12">
        <q-card-section class="q-pa-sm">
          <q-skeleton type="text" width="90%" class="q-mb-xs" animation="fade" />
          <div class="q-py-xs">
            <q-skeleton type="rect" width="40%" height="16px" animation="fade" />
          </div>
        </q-card-section>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import imageError from 'src/assets/no.image.1.1.png'
  import { useUIStore } from 'stores/ui.store'

  const { locale } = useI18n({ useScope: 'global' })
  const uiStore = useUIStore()

  const props = defineProps({
    product: {
      type: Object,
      default: null
    }
  })

  // --- Computed Helpers ---

  const currency = computed(() => uiStore.ui[0]?.currency || '')

  // The Translation Fallback Guard (Images & Title stay localized!)
  const activeLocaleData = computed(() => {
    if (!props.product?.locales) return null

    return (
      props.product.locales[locale.value] || // 1. Try active language
      props.product.locales['en-US'] || // 2. Try English fallback
      Object.values(props.product.locales)[0] || // 3. Try literally any language available
      null
    )
  })

  const isValidProduct = computed(() => !!activeLocaleData.value)

  // 🌟 REFACTOR: The Real Stock Calculator (Now safely checks the ROOT object!)
  const isOutOfStock = computed(() => {
    if (!props.product) return true

    const sizes = props.product.sizes || []

    // If it has sizes, check if ANY size has a quantity greater than 0
    if (sizes.length > 0) {
      const hasStockInSizes = sizes.some(s => s.qty > 0)
      return !hasStockInSizes
    }

    // If it's a generic item without sizes, check the root base quantity
    const qty = props.product.quantity || 0
    return qty <= 0
  })

  // --- Formatting and Logic ---
  const hasDiscount = computed(() => {
    if (!isValidProduct.value) return false
    return (
      props.product.discountPrice &&
      props.product.discountPrice > 0 &&
      props.product.discountPrice < props.product.price
    )
  })

  const formattedPrice = computed(() => {
    try {
      if (!isValidProduct.value) return ''
      return new Intl.NumberFormat([locale.value]).format(props.product.price)
    } catch {
      return 'n/a'
    }
  })

  const formattedDiscountPrice = computed(() => {
    try {
      if (!isValidProduct.value) return ''
      return new Intl.NumberFormat([locale.value]).format(props.product.discountPrice)
    } catch {
      return 'n/a'
    }
  })
</script>

<style lang="scss" scoped>
  .product-horizontal {
    width: 120px;
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
</style>
