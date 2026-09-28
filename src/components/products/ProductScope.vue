<template>
  <q-dialog
    v-model="ratingDialog"
    position="bottom"
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-card
      v-if="authStore.isAuthenticated"
      class="box-theme-card q-mx-sm q-mb-sm"
      :style="[{ width: '100%', maxWidth: '450px' }, offsetStyle]"
    >
      <q-card-section class="row items-center no-wrap q-py-sm bg-grey-2">
        <div class="text-subtitle1 text-primary text-weight-bold text-uppercase letter-spacing-1">
          {{ $t('title.RATING_USER') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup color="primary" />
      </q-card-section>

      <q-card-section align="center" class="q-pa-md">
        <div class="q-mb-md rating-preview-box q-pa-md">
          <q-rating
            class="cursor-pointer"
            v-model="ratingModel"
            size="2.5em"
            :max="5"
            color="primary"
            icon="star_border"
            icon-selected="star"
          />
        </div>

        <q-input
          v-model="ratingComment"
          outlined
          bg-color="white"
          type="textarea"
          rows="3"
          :label="$t('label.LBL_WRITE_REVIEW')"
          class="full-width"
        />
      </q-card-section>

      <q-card-actions class="q-px-md q-pb-md">
        <q-btn
          unelevated
          rounded
          outline
          color="primary"
          class="full-width text-weight-bold text-uppercase"
          @click="submitRating"
          v-close-popup
        >
          {{ $t('button.BTN_CONFIRM') }}
        </q-btn>
      </q-card-actions>
    </q-card>

    <q-card
      v-else
      class="box-theme-card q-mx-sm q-mb-sm"
      :style="[{ width: '100%', maxWidth: '350px' }, offsetStyle]"
    >
      <q-card-section class="row items-center no-wrap q-py-sm bg-grey-2">
        <div class="text-subtitle1 text-primary text-weight-bold text-uppercase letter-spacing-1">
          {{ $t('title.RATING_PROMPT') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup color="primary" />
      </q-card-section>

      <q-card-section align="center" class="q-pa-lg">
        <q-icon name="lock" size="3em" color="grey-4" class="q-mb-md" />
        <div class="text-body2 text-primary text-weight-medium">
          {{ $t('label.MSG_AUTH_REQUIRED') }}
        </div>
      </q-card-section>

      <q-card-actions vertical class="q-px-md q-pb-md q-gutter-y-sm">
        <q-btn
          color="primary"
          unelevated
          rounded
          @click="router.push({ name: 'login' })"
          class="text-weight-bold text-uppercase"
        >
          {{ $t('button.BTN_LOGIN') }}
        </q-btn>
        <q-btn
          outline
          rounded
          color="primary"
          class="text-weight-bold text-uppercase"
          v-close-popup
        >
          {{ $t('button.BTN_CLOSE') }}
        </q-btn>
      </q-card-actions>
    </q-card>
  </q-dialog>

  <div class="row q-col-gutter-lg q-pb-xl" v-if="productData.locales">
    <div class="col-xs-12 col-md-7">
      <div class="row q-col-gutter-md">
        <div class="col-2 column">
          <div class="col relative-position">
            <q-scroll-area
              ref="scrollArea"
              :thumb-style="thumbStyle"
              :bar-style="barStyle"
              class="absolute-full"
            >
              <div
                class="col-12 q-mb-sm productImagesBox rounded-borders overflow-hidden"
                v-for="(image, index) in productData.locales[locale].images"
                :key="index"
                @mouseenter="goToSlide(index)"
                :class="{ 'is-active': index === slide }"
                :id="`thumb-${index}`"
                :ref="el => (thumbnailRefs[index] = el)"
              >
                <q-img class="product-image" :src="image" :error-src="imageError" :ratio="1" />
              </div>
            </q-scroll-area>
          </div>
        </div>
        <div class="col-10 relative-position">
          <div v-if="hasDiscount" class="absolute-top-left q-ma-md" style="z-index: 10">
            <q-badge
              color="negative"
              class="text-weight-bold shadow-2"
              style="font-size: 1.1em; padding: 6px 10px; border-radius: 8px"
            >
              -{{ discountPercentage }}%
            </q-badge>
          </div>

          <q-responsive :ratio="1" style="max-height: 500px" class="full-width">
            <q-carousel
              animated
              swipeable
              v-model="slide"
              v-model:fullscreen="fullscreen"
              infinite
              arrows
              control-color="primary"
              control-type="flat"
              transition-prev="slide-right"
              transition-next="slide-left"
              class="rounded-borders border-grey"
            >
              <q-carousel-slide
                v-for="(image, index) in productData.locales[locale].images"
                class="cursor-pointer q-pa-none q-pa-sm"
                :key="index"
                :name="index"
              >
                <q-img
                  class="full-width full-height rounded-borders"
                  :src="image"
                  :error-src="imageError"
                  fit="contain"
                  no-default-spinner
                />
              </q-carousel-slide>
              <template v-slot:control>
                <q-carousel-control position="bottom-right" :offset="[18, 18]">
                  <q-btn
                    push
                    round
                    dense
                    color="white"
                    text-color="primary"
                    :icon="fullscreen ? 'fullscreen_exit' : 'fullscreen'"
                    @click="handleFullscreenToggle()"
                  />
                </q-carousel-control>
              </template>
            </q-carousel>
          </q-responsive>
        </div>
      </div>
    </div>

    <div class="col-xs-12 col-md-5">
      <div class="column justify-between full-height">
        <div>
          <div class="q-mb-sm" v-if="sellerName">
            <q-chip
              clickable
              flat
              dense
              size="md"
              class="q-ma-none text-weight-bold"
              :color="sellerRank.bgColor"
              :text-color="sellerRank.textColor"
              :icon="sellerRank.icon"
              @click.stop="goToSeller"
            >
              {{ sellerName }}
            </q-chip>
          </div>
          <div class="text-h4 text-bold text-dark q-mb-sm line-height-small">
            {{ productData.locales[locale].title }}
          </div>

          <div class="row full-width justify-between items-center q-mb-md">
            <div class="row items-center">
              <q-rating
                class="cursor-pointer q-mr-sm"
                readonly
                :model-value="productData.rating"
                size="1.2em"
                :max="5"
                color="primary"
                @click="openRatingDialog()"
              />
              <span
                class="text-caption text-grey-6 cursor-pointer hover-underline"
                @click="openRatingDialog()"
              >
                ({{ productData.ratings ? productData.ratings.length : 0 }}
                {{ $t('title.PROD_REVIEWS') }})
              </span>
            </div>

            <q-btn flat round dense color="grey-8" icon="share" @click="shareProduct()" />
          </div>

          <div class="text-body1 text-grey-8 q-mb-lg line-height-relaxed">
            {{ productData.locales[locale].description }}
          </div>

          <div v-if="productData.sizes && productData.sizes.length > 0" class="q-mb-lg">
            <div class="text-subtitle2 text-grey-9 q-mb-sm text-uppercase text-weight-bold">
              {{ $t('title.PROD_SIZES') }}
            </div>
            <div class="row q-gutter-sm">
              <q-btn
                v-for="(value, index) in productData.sizes"
                :key="index"
                :disable="value.qty <= 0"
                @click="activeSize(index)"
                :outline="index !== selectedSize"
                :unelevated="index === selectedSize"
                :color="index === selectedSize ? 'primary' : 'grey-5'"
                :text-color="index === selectedSize ? 'white' : 'dark'"
                class="text-weight-bold rounded-borders"
                style="min-width: 48px; height: 48px"
              >
                {{ value.size }}
              </q-btn>
            </div>
          </div>
        </div>

        <div class="q-pt-md">
          <div class="row items-end q-gutter-x-md q-mb-md">
            <div class="text-h3 text-bold" :class="hasDiscount ? 'text-negative' : 'text-primary'">
              {{ hasDiscount ? formattedDiscountPrice : formattedPrice }}
              <span class="text-h6 text-grey-8">{{ currency }}</span>
            </div>
            <div v-if="hasDiscount" class="text-h6 text-strike text-grey-5 q-pb-xs">
              {{ formattedPrice }}
            </div>
          </div>

          <q-btn
            rounded
            :disable="isAddToCartDisabled"
            class="full-width"
            size="lg"
            color="primary"
            :label="$t(addToCartLabel)"
            :icon="isPlatformService ? 'bolt' : 'shopping_cart'"
            @click="cartProcess(productData.id)"
            unelevated
          />
        </div>
      </div>
    </div>

    <div class="col-12 q-mt-xl" style="min-width: 0">
      <div class="row q-col-gutter-lg">
        <div class="col-xs-12 col-md-6" style="min-width: 0">
          <q-card
            flat
            bordered
            class="rounded-borders bg-grey-1 q-mb-md"
            style="max-width: 100%; overflow: hidden"
            v-if="
              productData.locales[locale].specifications &&
              productData.locales[locale].specifications[0]
            "
          >
            <q-expansion-item
              expand-separator
              icon="list"
              :label="$t('title.PROD_SPECS')"
              header-class="text-primary text-weight-bold text-uppercase"
              default-opened
            >
              <div style="max-width: 100%; overflow-x: auto">
                <q-markup-table flat dense separator="horizontal" class="bg-transparent no-shadow">
                  <tbody>
                    <tr
                      v-for="(info, index) in productData.locales[locale].specifications"
                      :key="index"
                      class="spec-row"
                    >
                      <td
                        class="text-left text-grey-8 text-weight-bold bg-grey-2"
                        style="
                          width: 40%;
                          min-width: 120px;
                          white-space: normal;
                          word-break: break-word;
                        "
                      >
                        {{ info.title }}
                      </td>
                      <td
                        class="text-left text-dark"
                        style="min-width: 150px; white-space: normal; word-break: break-word"
                      >
                        {{ info.description }}
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </div>
            </q-expansion-item>
          </q-card>

          <q-card
            flat
            bordered
            class="rounded-borders bg-grey-1"
            style="max-width: 100%; overflow: hidden"
            v-if="
              productData.locales[locale].declarations &&
              productData.locales[locale].declarations[0]
            "
          >
            <q-expansion-item
              expand-separator
              icon="info"
              :label="$t('title.PROD_ADD_INFO')"
              header-class="text-primary text-weight-bold text-uppercase"
            >
              <q-list separator>
                <q-item
                  v-for="(info, index) in productData.locales[locale].declarations"
                  :key="index"
                  class="q-py-md"
                >
                  <q-item-section>
                    <q-item-label
                      caption
                      class="text-uppercase text-primary q-mb-xs font-weight-bold"
                      >{{ info.title }}</q-item-label
                    >
                    <q-item-label
                      class="text-body2 text-grey-9"
                      style="white-space: normal; word-break: break-word"
                    >
                      {{ info.description }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>
            </q-expansion-item>
          </q-card>
        </div>

        <div class="col-xs-12 col-md-6" style="min-width: 0">
          <q-card
            flat
            bordered
            class="rounded-borders bg-grey-1 h-100"
            style="max-width: 100%; overflow: hidden"
          >
            <q-expansion-item
              expand-separator
              icon="star_rate"
              :label="`${$t('title.PROD_REVIEWS')} (${productData.ratings ? productData.ratings.length : 0})`"
              header-class="text-primary text-weight-bold text-uppercase"
              default-opened
            >
              <q-card-section>
                <div
                  v-if="!productData.ratings || productData.ratings.length === 0"
                  class="text-center q-pa-xl text-grey-6"
                >
                  <q-icon name="chat_bubble_outline" size="3em" class="q-mb-md" />
                  <div>{{ $t('msgSystem.NO_REVIEWS') }}</div>
                </div>

                <div v-else class="column q-gutter-y-md">
                  <q-chat-message
                    v-for="(review, index) in sortedReviews"
                    :key="index"
                    :name="review.userName ? review.userName : $t('label.CUSTOMER_ANON')"
                    :stamp="formatDate(review.date)"
                    bg-color="white"
                    text-color="dark"
                    class="shadow-1 rounded-borders q-pa-sm"
                  >
                    <template v-slot:avatar>
                      <q-avatar
                        color="primary"
                        text-color="white"
                        icon="person"
                        class="q-mr-sm"
                        size="md"
                      />
                    </template>
                    <div>
                      <q-rating
                        :model-value="review.rating"
                        size="1em"
                        :max="5"
                        color="orange"
                        readonly
                        class="q-mb-xs"
                      />
                      <div
                        v-if="review.comment"
                        style="white-space: pre-line; word-break: break-word"
                        class="text-body2"
                      >
                        {{ review.comment }}
                      </div>
                    </div>
                  </q-chat-message>
                </div>
              </q-card-section>
            </q-expansion-item>
          </q-card>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useQuasar } from 'quasar'
  import { watch, ref, nextTick, computed, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useRouter } from 'vue-router'
  import { date, useMeta } from 'quasar'

  // Composables & Assets
  import { useHorizontalScroll } from 'src/composables/useHorizontalScroll'
  import { useDialogOffset } from 'src/composables/useDialogOffset'
  import imageError from 'src/assets/no.image.1.1.png'

  // Stores
  import { useAuthStore } from 'src/stores/auth.store'
  import { usePRStore } from 'src/stores/products.store'
  import { useCartStore } from 'src/stores/cart.store'
  import { useNotifyStore } from 'src/stores/notify.store'
  import { useUIStore } from 'src/stores/ui.store'

  // --- Core Setup ---
  const $q = useQuasar()

  const props = defineProps({
    product: { type: Object, required: true }
  })

  const router = useRouter()
  const { locale, t } = useI18n({ useScope: 'global' })

  // Store Initialization
  const authStore = useAuthStore()
  const productsStore = usePRStore()
  const cartStore = useCartStore()
  const notifyStore = useNotifyStore()
  const uiStore = useUIStore()

  // --- Component State ---
  const productData = ref({ ...props.product })

  // Product Gallery & Carousel State
  const slide = ref(0)
  const fullscreen = ref(false)
  const slideOverCarousel = ref(true)
  const thumbnailRefs = ref([])
  const scrollArea = ref(null)
  const { thumbStyle, barStyle } = useHorizontalScroll(scrollArea)

  // Product Interaction State
  const selectedSize = ref(null)
  const ratingDialog = ref(false)
  const ratingModel = ref(0)
  const ratingComment = ref('')

  // --- Computed Properties ---

  const currency = computed(() => uiStore.ui[0]?.currency || '')
  const { offsetStyle } = useDialogOffset(computed(() => uiStore.ui[0]?.leftDrawerOpen || false))

  const isValidProduct = computed(() => {
    return productData.value && productData.value.locales && productData.value.locales[locale.value]
  })

  // ==========================================
  // 🌟 DYNAMIC META TAGS (SEO & LINK PREVIEWS)
  // ==========================================
  const metaData = computed(() => {
    if (!isValidProduct.value) return {}

    const locData = productData.value.locales[locale.value]
    const title = locData.title || 'Product'
    const desc = locData.description || t('info.APP_DESCRIPTION', 'Check out this product!')
    const image =
      locData.images?.[0] ||
      'https://res.cloudinary.com/dj3tlelan/image/upload/v1775605975/dimenzn-shop/admin/raanjbjagpuqew7rx38a.png' // Use your actual domain here

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

  // 🌟 REFACTOR: Math pulled from root!
  const hasDiscount = computed(() => {
    if (!isValidProduct.value) return false
    return (
      productData.value.discountPrice > 0 &&
      productData.value.discountPrice < productData.value.price
    )
  })

  // 🌟 REFACTOR: Math pulled from root!
  const discountPercentage = computed(() => {
    if (!hasDiscount.value) return 0
    const discount = 100 - (productData.value.discountPrice / productData.value.price) * 100
    return Math.round(discount)
  })

  // 🌟 REFACTOR: Price pulled from root!
  const formattedPrice = computed(() => {
    try {
      const price = productData.value.price
      return new Intl.NumberFormat([locale.value]).format(price)
    } catch {
      return 'n/a'
    }
  })

  // 🌟 REFACTOR: Discount Price pulled from root!
  const formattedDiscountPrice = computed(() => {
    try {
      const price = productData.value.discountPrice
      return new Intl.NumberFormat([locale.value]).format(price)
    } catch {
      return 'n/a'
    }
  })

  const currentUserRating = computed(() => {
    if (!authStore.isAuthenticated || !productData.value.ratings) return 0
    const userId = authStore.userProfile?._id
    if (!userId) return 0
    const userRating = productData.value.ratings.find(
      r => r.userId.toString() === userId.toString()
    )
    return userRating ? userRating.rating : 0
  })

  const currentUserComment = computed(() => {
    if (!authStore.isAuthenticated || !productData.value.ratings) return ''
    const userId = authStore.userProfile?._id
    if (!userId) return ''
    const userRating = productData.value.ratings.find(
      r => r.userId.toString() === userId.toString()
    )
    return userRating ? userRating.comment : ''
  })

  const sortedReviews = computed(() => {
    if (!productData.value.ratings) return []
    return [...productData.value.ratings].sort((a, b) => {
      if (!a.date) return 1
      if (!b.date) return -1
      return new Date(b.date) - new Date(a.date)
    })
  })

  // 🌟 REFACTOR: Stock logic pulled from root!
  const isAddToCartDisabled = computed(() => {
    if (!isValidProduct.value) return true

    const sizes = productData.value.sizes || []

    if (sizes.length > 0 && selectedSize.value === null) {
      return true
    }

    if (sizes.length === 0) {
      const qty = productData.value.quantity || 0
      if (qty <= 0) return true
    }

    return false
  })

  // 🌟 REFACTOR: Stock logic pulled from root!
  const addToCartLabel = computed(() => {
    if (!isValidProduct.value) return 'button.BTN_OUT_OF_STOCK'
    if (isPlatformService.value) return 'button.BTN_BUY_NOW'

    const sizes = productData.value.sizes || []
    const globalQty = productData.value.quantity || 0

    const isTotallyEmpty =
      sizes.length > 0 ? sizes.every(size => (size.qty || 0) <= 0) : globalQty <= 0

    return isTotallyEmpty ? 'button.BTN_OUT_OF_STOCK' : 'button.BTN_ADD_TO_CART'
  })

  // --- Seller Information Computed Properties ---
  const isPlatformService = computed(() => {
    if (!isValidProduct.value) return false
    return productData.value.isPlatformService === true
  })

  const sellerName = computed(() => {
    return productData.value?.sellerId?.storeProfile?.storeName || null
  })

  const sellerId = computed(() => {
    return productData.value?.sellerId?._id || productData.value?.seller || null
  })

  const sellerRank = computed(() => {
    const score = productData.value?.sellerId?.storeProfile?.trustScore ?? 1500
    if (isPlatformService.value) {
      return {
        name: 'Platform',
        // bgColor left empty for Quasar's clean default
        textColor: 'primary',
        icon: 'verified'
      }
    }
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

  // --- Actions ---
  const goToSeller = () => {
    if (sellerId.value) {
      router.push(`/seller/${sellerId.value}`)
    }
  }

  // --- Watchers ---

  watch(
    () => props.product,
    newVal => {
      productData.value = { ...newVal }
    },
    { deep: true }
  )

  watch(slide, newSlideIndex => {
    if (slideOverCarousel.value) {
      nextTick(() => {
        const activeThumbnailEl = thumbnailRefs.value[newSlideIndex]
        if (scrollArea.value && activeThumbnailEl) {
          scrollToActiveThumbnail(activeThumbnailEl)
        }
      })
    } else {
      slideOverCarousel.value = true
    }
  })

  // --- Methods: Gallery & Carousel ---

  function goToSlide(index) {
    slideOverCarousel.value = false
    slide.value = index
  }

  async function handleFullscreenToggle() {
    fullscreen.value = !fullscreen.value
    if (fullscreen.value === false) {
      await nextTick()
      await new Promise(resolve => setTimeout(resolve, 50))
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'smooth'
      })
    }
  }

  function scrollToActiveThumbnail(activeThumbnailEl) {
    if (!scrollArea.value || !activeThumbnailEl) return

    const scrollDetails = scrollArea.value.getScroll()
    const scrollPosition = scrollDetails.verticalPosition
    const viewPortHeight = scrollDetails.verticalContainerSize

    const thumbTop = activeThumbnailEl.offsetTop
    const thumbHeight = activeThumbnailEl.offsetHeight
    const thumbBottom = thumbTop + thumbHeight

    let targetOffset = scrollPosition

    if (thumbTop < scrollPosition) {
      targetOffset = thumbTop
    } else if (thumbBottom > scrollPosition + viewPortHeight) {
      targetOffset = thumbBottom - viewPortHeight
    }

    if (targetOffset !== scrollPosition) {
      scrollArea.value.setScrollPosition('vertical', targetOffset, 300)
    }
  }

  // --- Methods: Product Actions ---

  function activeSize(index) {
    selectedSize.value = index
  }

  // --- Methods: Product Actions ---

  function openRatingDialog() {
    // 1. Unauthenticated users see the standard "Login Required" lock screen
    if (!authStore.isAuthenticated) {
      ratingDialog.value = true
      return
    }

    // 2. 🌟 CRITICAL FIX: Check if the user already rated this product
    const userId = authStore.userProfile?._id
    const hasExistingRating = productData.value.ratings?.some(r => {
      const rId = typeof r.userId === 'object' ? r.userId._id : r.userId
      return rId?.toString() === userId?.toString()
    })

    // 3. FRONTEND INTERCEPTOR: Block ONLY if they haven't bought it AND haven't rated it before
    if (!productData.value.canReview && !hasExistingRating) {
      notifyStore.notify(
        403,
        t(
          'msgSystem.RATE_MUST_BUY',
          'You can only review products you have purchased and received.'
        )
      )
      return
    }

    // 4. User is verified! Load their past review data and open the form.
    ratingModel.value = currentUserRating.value
    ratingComment.value = currentUserComment.value
    ratingDialog.value = true
  }

  async function submitRating() {
    if (ratingModel.value === 0) return

    try {
      const updatedProduct = await productsStore.rateProduct(
        productData.value.id,
        ratingModel.value,
        ratingComment.value
      )

      if (updatedProduct) {
        productData.value = updatedProduct
      }

      ratingModel.value = 0
      ratingComment.value = ''
      ratingDialog.value = false
    } catch (error) {
      console.error('Rating submission failed', error)
    }
  }

  async function cartProcess(productId) {
    // 1. Platform Guard (Stripe Bypass)
    if (isPlatformService.value) {
      // 🌟 NEW GUARD: Google Play Policy Compliance
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

      // 🌟 Guard A: Require login for digital platform keys
      if (!authStore.isAuthenticated) {
        notifyStore.notify(
          403,
          t('msgSystem.ERR_LOGIN_TO_BUY', 'You must be logged in to purchase digital keys.')
        )
        router.push({ name: 'login' })
        return
      }

      // 🌟 Guard B: Prevent active sellers/admins from buying unnecessary keys
      const userRole = authStore.userProfile?.role || 'member'
      if (['seller', 'admin', 'platform'].includes(userRole)) {
        notifyStore.notify(
          400,
          t('msgSystem.ERR_ALREADY_UPGRADED', 'Your account is already fully upgraded!')
        )
        return
      }

      console.log('⚡ Bypassing Cart - Sending to Express Checkout:', productId)
      router.push({ name: 'checkout-digital', params: { id: productId } })
      return
    }

    // 2. Normal Physical Cart Logic
    let sizeString = null
    const sizes = productData.value.sizes || []

    if (sizes.length > 0) {
      if (selectedSize.value === null) {
        notifyStore.notify(400, 'msgSystem.VAL_REQ_FIELDS')
        return
      }
      sizeString = sizes[selectedSize.value].size
    }

    const alreadyInCart = cartStore.cart?.items?.some(
      item => item.productId === productId && item.size === sizeString
    )

    if (alreadyInCart) {
      notifyStore.notify(200, 'msgSystem.CART_ALREADY_ADDED')
      return
    }

    try {
      await cartStore.addToCart(productId, sizeString)
      notifyStore.notify(200, 'msgSystem.CART_ADDED_SUCCESS')
    } catch (error) {
      console.error('Failed to add to cart:', error)
      notifyStore.notify(500, 'msgSystem.GEN_UNEXPECTED')
    }
  }

  // ==========================================
  // 🌟 NATIVE SHARE API UPGRADE (With Locale Inject)
  // ==========================================
  async function shareProduct() {
    // 1. Build the Share URL dynamically to include the active language
    const urlObj = new URL(window.location.href)
    urlObj.searchParams.set('locale', locale.value)
    const productUrl = urlObj.toString() // e.g., https://th.dimenzn.com/product/123?locale=rs-RS

    const title = isValidProduct.value ? productData.value.locales[locale.value].title : ''
    const text = isValidProduct.value ? productData.value.locales[locale.value].description : ''

    // 2. Try Native Mobile/OS Share Panel first
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
          url: productUrl
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
        await navigator.clipboard.writeText(productUrl)
        notifyStore.notify(200, 'msgSystem.UI_LINK_COPIED')
      } catch (err) {
        console.error('Failed to copy product link: ', err)
        fallbackCopy(productUrl)
      }
    } else {
      fallbackCopy(productUrl)
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

  function formatDate(dateString) {
    if (!dateString) return ''
    return date.formatDate(dateString, 'DD.MM.YYYY')
  }

  onMounted(() => {
    if (productData.value?.id) {
      const storageKey = `viewed_product_${productData.value.id}`
      const hasViewed = localStorage.getItem(storageKey)

      if (!hasViewed) {
        productsStore.registerView(productData.value.id)
        localStorage.setItem(storageKey, 'true')
      }
    }
  })
</script>

<style lang="scss" scoped>
  .box-theme-card {
    border: 1px solid var(--q-primary);
    border-radius: 21px !important;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    background: white;
  }

  .rating-preview-box {
    background: var(--q-grey-2);
    border: 1px dashed var(--q-primary);
    border-radius: 16px;
  }

  .letter-spacing-1 {
    letter-spacing: 1px;
  }
  .productImagesBox {
    cursor: pointer;
    border: 2px solid transparent;
    transition: all 0.3s ease;

    &:hover .product-image {
      transform: scale(1.05);
    }
  }

  .is-active {
    border: 2px solid $primary;
  }

  .product-image {
    transition: transform 0.3s ease;
    transform-origin: center center;
  }

  .border-grey {
    border: 1px solid var(--q-grey-4);
  }

  .hover-underline:hover {
    text-decoration: underline;
  }

  .line-height-small {
    line-height: 1.1;
  }

  .line-height-relaxed {
    line-height: 1.6;
  }

  .spec-row:hover td {
    background-color: #e0e0e0 !important;
  }
</style>
