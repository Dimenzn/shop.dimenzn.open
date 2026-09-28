<template>
  <div class="row">
    <template v-if="displayPremiumProducts && displayPremiumProducts.length > 0">
      <div
        v-for="product in displayPremiumProducts"
        :key="product.id"
        class="col TopPickContainer shadow-3 q-ma-sm cursor-pointer relative-position"
        style="border-radius: 16px; overflow: hidden; min-width: 150px"
        :class="`bg-${getRankIconColor(product.sellerId?.storeProfile?.trustScore, product.isPlatformService)}`"
        @click="handleCardClick(product.id)"
      >
        <!-- <q-img
          :src="getProductImage(product)"
          class="absolute-full"
          fit="cover"
          style="filter: blur(1px); opacity: 0.1; transform: scale(1.1)"
        /> -->

        <div class="absolute-top-left q-px-sm q-pt-sm column" style="z-index: 2">
          <div>
            <q-chip
              class="shadow-5 text-weight-bold q-ma-none"
              text-color="white"
              size="sm"
              dense
              style="background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px)"
            >
              <q-avatar v-if="product.sellerId?.storeProfile?.storeLogo" size="xs">
                <img :src="product.sellerId.storeProfile.storeLogo" />
              </q-avatar>
              <q-icon v-else name="storefront" class="q-mr-xs" size="xs" />

              {{ product.sellerId?.storeProfile?.storeName || 'Premium Seller' }}

              <q-icon
                name="verified"
                :color="
                  getRankIconColor(
                    product.sellerId?.storeProfile?.trustScore,
                    product.isPlatformService
                  )
                "
                class="q-ml-xs"
                size="xs"
              >
                <q-tooltip class="bg-dark text-body2">
                  {{
                    product.isPlatformService
                      ? $t('seller.OFFICIAL PLATFORM', 'Official Platform')
                      : $t('seller.TOP_RATED', 'Top Rated')
                  }}
                </q-tooltip>
              </q-icon>
            </q-chip>
          </div>

          <div class="q-ml-md" v-if="hasDiscount(product)">
            <q-badge color="negative" class="shadow-2 text-weight-bold">
              -{{ getDiscountPercentage(product) }}%
            </q-badge>
          </div>
        </div>

        <div
          class="relative-position full-height full-width flex flex-center q-pa-sm"
          style="z-index: 1"
        >
          <MostPremiumScope :product="product" />
        </div>
      </div>
    </template>

    <!-- <template v-else>
      <div
        v-for="n in 9"
        :key="n"
        class="col TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm relative-position"
        style="border-radius: 16px; overflow: hidden; min-width: 175px"
      >
        <div class="relative-position full-height full-width flex flex-center">
          <MostPremiumScope :product="null" />
        </div>
      </div>
    </template> -->
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  //import { useI18n } from 'vue-i18n'

  import { usePRStore } from 'src/stores/products.store'
  import MostPremiumScope from 'src/components/premium/MostPremiumScope.vue'

  const router = useRouter()
  const productStore = usePRStore()
  //const { locale } = useI18n({ useScope: 'global' })

  const { productsPremium } = storeToRefs(productStore)

  // ==========================================
  // 🌟 SORTING: Pin the Platform to the end!
  // ==========================================
  const displayPremiumProducts = computed(() => {
    const allProducts = productsPremium.value || []

    // 1. Grab all normal sellers
    const normalProducts = allProducts.filter(p => !p.isPlatformService)

    // 2. Grab the platform product(s)
    const platformProducts = allProducts.filter(p => p.isPlatformService)

    // 3. Return the array with the platform explicitly pushed to the end
    return [...normalProducts, ...platformProducts]
  })

  // --- Helpers ---
  // const getProductImage = product => {
  //   const img = product?.locales?.[locale.value]?.images?.[0]
  //   return img || 'https://cdn.quasar.dev/img/material.png'
  // }

  // ==========================================
  // 🌟 COLORING: Official Platform Neon Purple
  // ==========================================
  const getRankIconColor = (score, isPlatform) => {
    // Intercept platform items and force the purple branding
    if (isPlatform) return 'primary'

    const s = score ?? 1500
    if (s < 1500) return 'brown-4' // Bronze
    if (s < 2500) return 'blue-grey-4' // Silver
    if (s < 3500) return 'amber-5' // Gold
    return 'cyan-4' // Diamond
  }

  const hasDiscount = product => {
    if (!product) return false
    return (
      product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price
    )
  }

  const getDiscountPercentage = product => {
    if (!hasDiscount(product)) return 0
    return Math.round(100 - (product.discountPrice / product.price) * 100)
  }

  // --- Actions ---
  const handleCardClick = id => {
    router.push(`/product/${id}`)
  }
</script>
