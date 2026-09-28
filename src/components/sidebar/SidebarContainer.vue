<template>
  <div class="fit q-pa-sm bg-transparent">
    <div
      class="column no-wrap TopPickContainer shadow-3 full-height"
      style="
        border-radius: 16px;
        overflow: hidden;
        background: rgba(255, 255, 255, 0.75);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
      "
    >
      <q-scroll-area class="col q-my-sm">
        <div class="q-pa-md">
          <div class="q-mb-md">
            <q-input
              dense
              outlined
              v-model="localFilters.search"
              :label="$t('label.SEARCH')"
              color="primary"
              debounce="800"
              :disable="filtersDisabled"
              @update:model-value="applyFilters"
            >
              <template v-slot:append>
                <q-icon name="search" :color="filtersDisabled ? 'grey-5' : ''" />
              </template>

              <q-tooltip v-if="filtersDisabled">
                {{ $t('msg.SELECT_CATEGORY_TO_FILTER') }}
              </q-tooltip>
            </q-input>
          </div>

          <q-separator class="q-my-md" />

          <div class="q-mb-md">
            <div class="text-subtitle2 q-mb-sm text-primary text-weight-bolder text-uppercase">
              {{ $t('title.HOME_CATEGORIES') }}
            </div>
            <q-list dense>
              <div v-if="categories.length">
                <SidebarCategories
                  v-for="category in categories"
                  :key="category.id"
                  v-bind="category"
                  :active-id="route.params.id"
                />
              </div>
              <div v-else>
                <q-skeleton type="text" v-for="n in 5" :key="n" class="q-my-sm" />
              </div>
            </q-list>
          </div>

          <q-separator class="q-my-md" />

          <div :class="{ 'disabled-area': filtersDisabled }">
            <div class="q-mb-lg">
              <div
                class="text-subtitle2 q-mb-sm text-weight-bolder text-uppercase"
                :class="filtersDisabled ? 'text-grey-5' : 'text-primary'"
              >
                {{ $t('label.PRICE_RANGE') }} ({{ currency }})
              </div>

              <div
                class="row items-center justify-between q-mb-sm text-caption"
                :class="filtersDisabled ? 'text-grey-5' : 'text-primary'"
              >
                <span class="text-bold">{{ formatPrice(localFilters.minPrice) }}</span>
                <span class="text-bold">{{ formatPrice(localFilters.maxPrice) }}</span>
              </div>

              <q-range
                style="max-width: 240px"
                class="q-mx-auto"
                v-model="priceRange"
                :min="rangeLimits.min"
                :max="rangeLimits.max"
                :step="10"
                label
                :left-label-value="formatPrice(priceRange.min)"
                :right-label-value="formatPrice(priceRange.max)"
                color="primary"
                thumb-size="15px"
                :disable="filtersDisabled"
                @change="handlePriceChange"
              />
            </div>

            <q-separator class="q-my-md" />

            <div class="q-mb-md">
              <div
                class="text-subtitle2 q-mb-sm text-weight-bolder text-uppercase"
                :class="filtersDisabled ? 'text-grey-5' : 'text-primary'"
              >
                {{ $t('label.SORT_BY') }}
              </div>
              <q-option-group
                v-model="localFilters.sort"
                :options="sortOptions"
                color="primary"
                size="xs"
                dense
                :disable="filtersDisabled"
                @update:model-value="applyFilters"
              />
            </div>

            <q-btn
              outline
              color="primary"
              class="full-width q-mt-md text-weight-bold"
              :label="$t('button.BTN_RESET_FILTERS')"
              icon="restart_alt"
              :disable="filtersDisabled"
              @click="resetFilters"
            />
          </div>
        </div>
      </q-scroll-area>

      <div class="col-auto q-pb-sm q-px-sm" v-if="showInfoPage">
        <q-separator class="q-mb-sm" />
        <q-btn
          flat
          color="primary"
          class="full-width text-weight-bold"
          icon="help_outline"
          :label="$t('title.PAGE_INFO', 'Store Info')"
          to="/info"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch, computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'
  import SidebarCategories from 'src/components/sidebar/SidebarCategories.vue'
  import { useCAStore } from 'src/stores/categories.store'
  import { useUIStore } from 'src/stores/ui.store'
  import { usePRStore } from 'src/stores/products.store'

  const route = useRoute()
  const router = useRouter()
  const { t, locale } = useI18n()

  // Stores
  const categoryStore = useCAStore()
  const { categories } = storeToRefs(categoryStore)
  const uiStore = useUIStore()
  const productStore = usePRStore()

  const currency = computed(() => uiStore.ui[0]?.currency || '$')
  const { maxPriceLimit } = storeToRefs(productStore)

  // --- HELPER: Number Formatter ---
  const formatPrice = value => {
    if (value === undefined || value === null) return ''

    // Uses the current active 'locale' (e.g. 'en-US' or 'de-DE')
    return new Intl.NumberFormat(locale.value, {
      style: 'decimal',
      maximumFractionDigits: 0 // Keep it clean (no decimals for ranges usually)
    }).format(value)
  }

  // If the DB hasn't loaded or the field is missing, default to true
  const showInfoPage = computed(() => {
    return uiStore.ui[0]?.showInfoPage ?? true
  })

  // --- 1. FILTER AVAILABILITY LOGIC ---
  // Filters are ONLY enabled if we are inside a category route
  // Adjust the string check if your route structure is different (e.g. named routes)
  const filtersDisabled = computed(() => {
    return !route.path.startsWith('/category/')
  })

  // --- 2. DYNAMIC CONFIGURATION ---
  const rangeLimits = ref({
    min: 0,
    max: 2000
  })

  watch(maxPriceLimit, newVal => {
    rangeLimits.value.max = newVal
  })

  const sortOptions = computed(() => [
    { label: t('label.SORT_NEWEST'), value: 'newest' },
    { label: t('label.SORT_PRICE_ASC'), value: 'price_asc' },
    { label: t('label.SORT_PRICE_DESC'), value: 'price_desc' },
    { label: t('label.SORT_POPULAR'), value: 'rating' }
  ])

  // --- State ---
  const priceRange = ref({ min: 0, max: 2000 })

  const localFilters = ref({
    search: '',
    sort: 'newest',
    minPrice: 0,
    maxPrice: 2000
  })

  // --- Logic ---

  // 3. WATCH URL CHANGES
  watch(
    () => route.query,
    newQuery => {
      localFilters.value.search = newQuery.search || ''
      localFilters.value.sort = newQuery.sort || 'newest'

      const min = Number(newQuery.minPrice) || rangeLimits.value.min
      const max = Number(newQuery.maxPrice) || rangeLimits.value.max

      localFilters.value.minPrice = min
      localFilters.value.maxPrice = max

      priceRange.value = { min, max }
    },
    { immediate: true }
  )

  // 4. WATCH CATEGORY CHANGES (Update Slider Limits)
  watch(
    () => route.params.id,
    async newId => {
      // If we are NOT on a category page, do nothing (or reset to default)
      if (!newId || filtersDisabled.value) return

      await productStore.fetchMaxPrice(newId, locale.value)

      rangeLimits.value.max = maxPriceLimit.value

      if (!route.query.maxPrice) {
        priceRange.value.max = maxPriceLimit.value
        localFilters.value.maxPrice = maxPriceLimit.value
      }
    },
    { immediate: true }
  )

  // 5. APPLY FILTERS
  const applyFilters = () => {
    if (filtersDisabled.value) return

    router.push({
      query: {
        ...route.query,
        search: localFilters.value.search || undefined,
        sort: localFilters.value.sort,
        minPrice:
          localFilters.value.minPrice > rangeLimits.value.min
            ? localFilters.value.minPrice
            : undefined,
        maxPrice:
          localFilters.value.maxPrice < rangeLimits.value.max
            ? localFilters.value.maxPrice
            : undefined
      }
    })
  }

  // 6. SLIDER HANDLER
  const handlePriceChange = val => {
    if (filtersDisabled.value) return

    localFilters.value.minPrice = val.min
    localFilters.value.maxPrice = val.max
    applyFilters()
  }

  // 7. RESET
  const resetFilters = () => {
    if (filtersDisabled.value) return
    router.push({ path: route.path })
  }
</script>

<style lang="scss" scoped>
  .disabled-area {
    opacity: 0.5;
    pointer-events: none; /* Prevents clicks entirely */
    filter: grayscale(100%);
    transition: all 0.3s ease;
  }
</style>
