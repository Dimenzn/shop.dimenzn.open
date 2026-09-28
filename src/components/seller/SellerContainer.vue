<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pb-sm"
    style="height: calc(100dvh - 120px); overflow: hidden; border-radius: 16px"
  >
    <q-scroll-area ref="scrollArea" class="fit">
      <div v-if="sellerProfile" class="seller-profile-section q-mb-lg">
        <div class="relative-position q-mb-lg">
          <div
            class="bg-black relative-position"
            style="border-radius: 16px 16px 0 0; overflow: hidden"
          >
            <q-img
              :src="sellerProfile.storeBanner || baseBanner"
              :error-src="baseBanner"
              class="absolute-full"
              fit="cover"
              style="filter: blur(30px); transform: scale(1.1)"
            />

            <q-responsive :ratio="9 / 3" class="full-width">
              <q-img
                :src="sellerProfile.storeBanner || baseBanner"
                :error-src="baseBanner"
                height="200px"
                fit="contain"
                position="50% 0"
                class="bg-transparent"
              />
            </q-responsive>
          </div>

          <div
            class="absolute-bottom text-center"
            style="transform: translateY(50%); width: 100%; z-index: 2"
          >
            <q-avatar size="100px" class="shadow-5 bg-white">
              <q-img :src="sellerProfile.storeLogo || baseLogo" :error-src="baseLogo" ratio="1" />
            </q-avatar>
          </div>
        </div>

        <div class="text-center q-mt-xl q-pt-lg q-pb-md">
          <div class="row justify-center items-center q-mb-sm">
            <div class="col-12 text-h5 text-weight-bolder text-primary letter-spacing-1">
              {{ sellerProfile.storeName || 'Unnamed Store' }}
            </div>
            <div class="col-12">
              <q-chip
                v-if="sellerRank"
                :color="sellerRank.bgColor"
                :text-color="sellerRank.textColor"
                dense
                class="text-weight-bold shadow-1"
              >
                <q-icon :name="sellerRank.icon" size="xs" class="q-mr-xs" />

                <span v-if="isPlatformSeller">{{
                  $t('seller.OFFICIAL PLATFORM', 'Official Platform')
                }}</span>
                <span v-else>{{ sellerProfile.trustScore || 1500 }} SR</span>
              </q-chip>
            </div>
          </div>

          <div
            class="text-grey-7 text-body1 q-px-md q-mb-lg"
            style="max-width: 650px; margin: 0 auto; line-height: 1.6"
          >
            {{
              sellerProfile.storeDescription ||
              $t('seller.NO_DESCRIPTION', 'This seller has not added a description yet.')
            }}
          </div>

          <div class="row justify-center items-center wrap q-gutter-sm q-pt-sm">
            <template v-if="hasActiveSocials">
              <q-btn
                v-if="sellerProfile.socials.email?.show && sellerProfile.socials.email?.url"
                flat
                round
                color="grey-8"
                icon="mail"
                type="a"
                :href="`mailto:${sellerProfile.socials.email.url}`"
              >
                <q-tooltip class="bg-grey-9">Email</q-tooltip>
              </q-btn>

              <q-btn
                v-if="sellerProfile.socials.whatsapp?.show && sellerProfile.socials.whatsapp?.url"
                flat
                round
                color="green-14"
                icon="fab fa-whatsapp"
                type="a"
                :href="`https://wa.me/${cleanPhoneForLink(sellerProfile.socials.whatsapp.url)}`"
                target="_blank"
              >
                <q-tooltip class="bg-green-14">WhatsApp</q-tooltip>
              </q-btn>

              <q-btn
                v-if="sellerProfile.socials.viber?.show && sellerProfile.socials.viber?.url"
                flat
                round
                color="purple-13"
                icon="fab fa-viber"
                type="a"
                :href="`viber://chat?number=${cleanPhoneForLink(sellerProfile.socials.viber.url)}`"
                target="_blank"
              >
                <q-tooltip class="bg-purple-13">Viber</q-tooltip>
              </q-btn>

              <q-btn
                v-if="sellerProfile.socials.instagram?.show && sellerProfile.socials.instagram?.url"
                flat
                round
                color="pink-13"
                icon="fab fa-instagram"
                type="a"
                :href="sellerProfile.socials.instagram.url"
                target="_blank"
              >
                <q-tooltip class="bg-pink-13">Instagram</q-tooltip>
              </q-btn>

              <q-btn
                v-if="sellerProfile.socials.facebook?.show && sellerProfile.socials.facebook?.url"
                flat
                round
                color="blue-8"
                icon="fab fa-facebook"
                type="a"
                :href="sellerProfile.socials.facebook.url"
                target="_blank"
              >
                <q-tooltip class="bg-blue-8">Facebook</q-tooltip>
              </q-btn>

              <q-btn
                v-if="sellerProfile.socials.x?.show && sellerProfile.socials.x?.url"
                flat
                round
                color="black"
                icon="fab fa-x-twitter"
                type="a"
                :href="sellerProfile.socials.x.url"
                target="_blank"
              >
                <q-tooltip class="bg-black">X (Twitter)</q-tooltip>
              </q-btn>

              <q-btn
                v-if="sellerProfile.socials.tiktok?.show && sellerProfile.socials.tiktok?.url"
                flat
                round
                color="black"
                icon="fab fa-tiktok"
                type="a"
                :href="sellerProfile.socials.tiktok.url"
                target="_blank"
              >
                <q-tooltip class="bg-black">TikTok</q-tooltip>
              </q-btn>

              <q-btn
                v-if="sellerProfile.socials.youtube?.show && sellerProfile.socials.youtube?.url"
                flat
                round
                color="red-14"
                icon="fab fa-youtube"
                type="a"
                :href="sellerProfile.socials.youtube.url"
                target="_blank"
              >
                <q-tooltip class="bg-red-14">YouTube</q-tooltip>
              </q-btn>
            </template>
            <q-separator
              v-if="hasActiveSocials"
              vertical
              class="q-mx-sm bg-grey-4"
              style="height: 40px"
            />

            <q-btn
              outline
              rounded
              color="primary"
              icon="share"
              :label="$t('button.BTN_SHARE', 'Share Store')"
              class="q-px-md q-mr-sm"
              @click="shareProduct()"
            />
          </div>
        </div>
      </div>

      <q-separator class="q-my-md q-mx-lg" color="grey-3" />

      <div class="text-h6 text-weight-bold q-px-md q-mb-md text-grey-8">
        {{ $t('title.SELLER_PRODUCTS', 'All Products') }} ({{ products.length || 0 }})
      </div>

      <div class="col" style="position: relative">
        <div v-if="products.length > 0" class="row justify-center q-pb-xl">
          <div
            v-for="product in products"
            :key="product.id"
            class="col-auto q-mx-sm q-my-sm cursor-pointer"
            @click="handleCardClick('product', product.id)"
          >
            <NewArrivalScope :product="product" />
          </div>

          <div
            v-if="paging.currentPage < paging.totalPages"
            class="col-12 text-center q-pa-md q-mb-xl"
          >
            <q-btn
              outline
              color="primary"
              :label="$t('button.BTN_LOAD_MORE')"
              :loading="isLoading"
              @click="loadMore"
            />
          </div>
        </div>

        <div v-else-if="!isLoading" class="row justify-center q-pb-xl q-pt-xl">
          <div class="column items-center text-grey-5">
            <q-icon name="inventory_2" size="64px" class="q-mb-md" />
            <div class="text-h6">{{ $t('title.ERR_NO_PRODUCTS', 'No products found.') }}</div>
          </div>
        </div>

        <div v-else class="row justify-center q-pa-xl">
          <q-spinner color="primary" size="3em" />
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup>
  import { ref, watch, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n' // 🌟 ADDED: For translations
  import { useMeta } from 'quasar'

  import NewArrivalScope from 'src/components/arrivals/NewArrivalScope.vue'
  import { usePRStore } from 'src/stores/products.store'
  import { useNotifyStore } from 'src/stores/notify.store'
  import { useSellerStore } from 'src/stores/seller.store'

  import baseBanner from 'src/assets/base.banner.png'
  import baseLogo from 'src/assets/base.logo.png'

  const route = useRoute()
  const router = useRouter()
  const { t, locale } = useI18n({ useScope: 'global' }) // 🌟 ADDED

  // Stores
  const productsStore = usePRStore()
  const sellerStore = useSellerStore()
  const notifyStore = useNotifyStore()

  // State extraction
  const { products, paging } = storeToRefs(productsStore)
  const { currentSellerProfile: sellerProfile } = storeToRefs(sellerStore)

  // Local UI State
  const isLoading = ref(false)

  const isPlatformSeller = computed(() => {
    if (!sellerProfile.value) return false
    // Depending on what your backend returns, check the role or the hardcoded store name
    return sellerProfile.value.sellerTier === 'platform'
  })

  // 🌟 NEW: Calculate Rank Info (Matches NewArrivalScope & Dashboard)
  const sellerRank = computed(() => {
    console.log(sellerStore)
    if (!sellerProfile.value) return null

    // 1. Platform Guard
    if (isPlatformSeller.value) {
      return {
        name: 'Platform',
        // bgColor left empty for clean default
        textColor: 'primary',
        icon: 'verified'
      }
    }

    const score = sellerProfile.value.trustScore ?? 1500
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

  const hasActiveSocials = computed(() => {
    if (!sellerProfile.value?.socials) return false
    return Object.values(sellerProfile.value.socials).some(
      social => social?.show && social?.url?.trim()
    )
  })

  // --- Actions ---
  const handleCardClick = (type, id) => {
    if (type === 'product') {
      router.push(`/product/${id}`)
    }
  }

  // ==========================================
  // 🌟 DYNAMIC META TAGS (SEO & BROWSER TABS)
  // ==========================================
  const metaData = computed(() => {
    if (!sellerProfile.value) return {}

    const storeName = sellerProfile.value.storeName || 'Seller'
    const title = `${storeName} | Dimenzn`
    const desc =
      sellerProfile.value.storeDescription ||
      t('seller.NO_DESCRIPTION', 'Check out this store on Dimenzn!')

    // Prefer the banner, fallback to logo, fallback to a default Dimenzn image
    const image =
      sellerProfile.value.storeBanner ||
      sellerProfile.value.storeLogo ||
      'https://res.cloudinary.com/dj3tlelan/image/upload/v1775605975/dimenzn-shop/admin/raanjbjagpuqew7rx38a.png'

    return {
      title: title,
      meta: {
        description: { name: 'description', content: desc },
        ogTitle: { property: 'og:title', content: title },
        ogDesc: { property: 'og:description', content: desc },
        ogImage: { property: 'og:image', content: image },
        ogUrl: { property: 'og:url', content: window.location.href },
        twitterCard: { name: 'twitter:card', content: 'summary_large_image' },
        twitterTitle: { name: 'twitter:title', content: title },
        twitterDesc: { name: 'twitter:description', content: desc },
        twitterImage: { name: 'twitter:image', content: image }
      }
    }
  })

  // Inject the meta tags into the document head
  useMeta(metaData)

  // ==========================================
  // 🌟 NATIVE SHARE API UPGRADE (With Locale Inject)
  // ==========================================
  async function shareProduct() {
    // 1. Build the Share URL dynamically to include the active language
    const urlObj = new URL(window.location.href)
    urlObj.searchParams.set('locale', locale.value)
    const storeUrl = urlObj.toString()

    const title = sellerProfile.value?.storeName || 'Dimenzn Store'
    const text =
      sellerProfile.value?.storeDescription ||
      t('seller.NO_DESCRIPTION', 'Check out this store on Dimenzn!')

    // 2. Try Native Mobile/OS Share Panel first
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: storeUrl
        })
        return // OS handled the UI, we are done!
      } catch (err) {
        if (err.name === 'AbortError') return // User manually closed the share dialog
        console.warn('Native Web Share failed, falling back to clipboard.', err)
      }
    }

    // 3. Fallback to Clipboard Copy (For older desktop browsers)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(storeUrl)
        notifyStore.notify(200, 'msgSystem.UI_LINK_COPIED')
      } catch (err) {
        console.error('Failed to copy store link: ', err)
        fallbackCopy(storeUrl)
      }
    } else {
      fallbackCopy(storeUrl)
    }
  }

  function fallbackCopy(text) {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'absolute'
      textArea.style.left = '-999999px'

      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      document.execCommand('copy')
      textArea.remove()

      notifyStore.notify(200, 'msgSystem.UI_LINK_COPIED')
    } catch (err) {
      console.error('Fallback copy failed: ', err)
      notifyStore.notify(500, 'msgSystem.UI_LINK_COPY_ERR')
    }
  }

  const cleanPhoneForLink = phone => {
    if (!phone) return ''
    return String(phone).replace(/[^0-9]/g, '')
  }

  const loadData = async (filterParams, append = false) => {
    if (!append) products.value = []
    isLoading.value = true

    try {
      await productsStore.fetchProducts(filterParams, append)
    } catch (e) {
      console.error('Failed to load seller products', e)
    } finally {
      isLoading.value = false
    }
  }

  const loadMore = () => {
    const nextPage = paging.value.currentPage + 1
    const filters = {
      seller: route.params.id,
      page: nextPage,
      ...route.query
    }
    loadData(filters, true)
  }

  // --- Watchers ---
  watch(
    [() => route.params.id, () => route.query],
    async ([newId, newQuery]) => {
      if (!newId) return

      const profileResult = await sellerStore.fetchSellerProfile(newId)

      if (!profileResult.success && profileResult.status === 404) {
        router.push('/')
        return
      }

      const filters = {
        seller: newId,
        page: 1,
        ...newQuery
      }
      loadData(filters, false)
    },
    { immediate: true }
  )
</script>
