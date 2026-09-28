<template>
  <div
    v-if="combinedSlides.length > 0"
    class="shadow-3 q-ma-sm bg-black"
    style="border-radius: 16px; overflow: hidden"
  >
    <q-responsive :ratio="9 / 3" class="full-width">
      <q-carousel
        animated
        v-model="slide"
        infinite
        :autoplay="autoplay"
        arrows
        swipeable
        navigation
        transition-prev="slide-right"
        transition-next="slide-left"
        @mouseenter="autoplay = false"
        @mouseleave="autoplay = true"
        class="full-height bg-transparent"
      >
        <q-carousel-slide
          v-for="(item, index) in combinedSlides"
          :key="index"
          :name="index"
          class="cursor-pointer q-pa-none relative-position bg-black"
          @click="openLink(item.link)"
        >
          <q-img
            :src="fallbackImage(item.image)"
            class="absolute-full"
            fit="cover"
            style="filter: blur(30px); opacity: 0.5"
          />

          <q-img
            :src="fallbackImage(item.image)"
            class="absolute-full bg-transparent"
            fit="contain"
            position="50% 50%"
          />

          <div
            v-if="item.isSeller && item.sellerName !== 'AD'"
            class="absolute-top-left q-pa-md"
            style="z-index: 2"
          >
            <q-chip
              class="shadow-5 text-weight-bold"
              text-color="white"
              style="background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px)"
            >
              <q-avatar v-if="item.logo">
                <img :src="item.logo" />
              </q-avatar>
              <q-icon v-else name="storefront" class="q-mr-xs" />

              {{ item.sellerName }}

              <q-icon
                name="verified"
                :color="getRankIconColor(item.trustScore)"
                class="q-ml-sm"
                size="xs"
              >
                <q-tooltip v-if="item.trustScore !== 'platform'" class="bg-dark text-body2">{{
                  $t('seller.TOP_RATED')
                }}</q-tooltip>
                <q-tooltip v-else class="bg-dark text-body2">
                  {{ $t('seller.OFFICIAL PLATFORM', 'Official Platform') }}
                </q-tooltip>
              </q-icon>
            </q-chip>
          </div>
        </q-carousel-slide>
      </q-carousel>
    </q-responsive>
  </div>

  <!-- <div v-else class="shadow-3 q-ma-sm" style="border-radius: 16px; overflow: hidden">
    <q-responsive :ratio="9 / 3" class="full-width">
      <q-skeleton class="full-width full-height" square animation="fade" />
    </q-responsive>
  </div> -->
</template>

<script setup>
  import { ref, computed } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'

  import defaultImage from 'src/assets/base.banner.png'
  import errorImage from 'src/assets/base.banner.png'

  // --- Props ---
  const props = defineProps({
    ads: {
      type: Array,
      default: () => []
    },
    topSellers: {
      type: Array,
      default: () => []
    }
  })

  // --- Composables & State ---
  const { locale } = useI18n({ useScope: 'global' })
  const router = useRouter()

  const slide = ref(0)
  const autoplay = ref(true)

  // ==========================================
  // 🌟 THE UNIFIED SLIDE GENERATOR
  // ==========================================
  const combinedSlides = computed(() => {
    const slides = []

    // 1. Map Top Sellers (Max 6)
    if (props.topSellers && props.topSellers.length > 0) {
      const sellers = props.topSellers.slice(0, 7).map(seller => ({
        image: seller.storeProfile?.storeBanner,
        link: `/seller/${seller._id}`,
        isSeller: true,
        sellerName: seller.storeProfile?.storeName || 'Top Seller',
        logo: seller.storeProfile?.storeLogo,
        trustScore: seller.storeProfile?.trustScore
      }))
      slides.push(...sellers)
    }

    // 2. Map Platform/Admin Custom Ads
    if (props.ads && props.ads.length > 0) {
      const adminAds = props.ads.map(ad => ({
        image: ad.locales[locale.value]?.image,
        link: ad.locales[locale.value]?.link,
        isSeller: true, // 🌟 THE FIX: Turn the chip on!
        sellerName: ad.locales[locale.value]?.title,
        logo: ad.locales[locale.value]?.logo,
        trustScore: 'platform'
      }))
      slides.push(...adminAds)
    }

    return slides
  })

  // 🌟 NEW: Trust Score Color Helper
  const getRankIconColor = score => {
    const s = score ?? 1500
    if (s === 'platform') return 'primary'
    if (s < 1500) return 'brown-4' // Bronze
    if (s < 2500) return 'blue-grey-4' // Silver
    if (s < 3500) return 'amber-5' // Gold
    return 'cyan-4' // Diamond
  }

  // --- Actions ---
  const openLink = link => {
    if (!link || link === '#') return

    if (link.startsWith('http') || link.startsWith('www')) {
      const targetUrl = link.startsWith('www') ? `https://${link}` : link
      window.location.href = targetUrl
    } else {
      router.push(link)
    }
  }

  const fallbackImage = url => {
    if (url?.trim() === 'default') return defaultImage
    if (!url || typeof url !== 'string' || url.trim() === '#') return errorImage
    return url
  }
</script>
