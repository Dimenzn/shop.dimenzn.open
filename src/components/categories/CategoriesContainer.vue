<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); overflow: hidden; border-radius: 16px"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ pageTitle }}
    </div>

    <div class="col-auto q-mb-sm">
      <q-tabs
        :model-value="route.params.id"
        dense
        outside-arrows
        mobile-arrows
        align="left"
        indicator-color="transparent"
        active-color="white"
        active-bg-color="primary"
        class="text-primary"
      >
        <q-tab
          v-for="sub in selectedCategory.sub"
          :key="sub.id"
          :name="sub.link"
          :label="sub.title[locale]"
          no-caps
          class="q-px-md q-mx-xs text-weight-medium cursor-pointer"
          style="border-radius: 20px; border: 1px solid var(--q-primary); min-height: 32px"
          @click="handleCardClick('category', sub.link)"
        />
      </q-tabs>
    </div>

    <div class="col" style="position: relative">
      <q-scroll-area ref="scrollArea2" class="absolute-full q-pr-sm">
        <div v-if="products.length > 0" class="row justify-center q-pb-xl">
          <div
            v-for="product in products"
            :key="product.id"
            class="col-auto q-mx-sm q-my-sm cursor-pointer"
            @click="handleCardClick('product', product.id)"
          >
            <NewArrivalScope :product="product" />
          </div>

          <div v-if="paging.currentPage < paging.totalPages" class="col-12 text-center q-pa-md">
            <q-btn
              outline
              color="primary"
              :label="$t('button.BTN_LOAD_MORE')"
              :loading="isLoading"
              @click="loadMore"
            />
          </div>
        </div>

        <div v-else-if="!isLoading" class="row justify-center q-pb-xl">
          <div class="col-auto q-mx-sm q-my-sm text-primary text-weight-normal text-h6">
            {{ $t('title.ERR_NO_PRODUCTS') }}
          </div>
        </div>

        <div v-else class="row justify-center q-pa-xl">
          <q-spinner color="primary" size="3em" />
        </div>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
  // 1. Vue & Library Imports
  import { computed, ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { storeToRefs } from 'pinia'

  // 2. Component & Store Imports
  import NewArrivalScope from 'src/components/arrivals/NewArrivalScope.vue'
  import { useCAStore } from 'src/stores/categories.store'
  import { usePRStore } from 'src/stores/products.store'

  // --- Composables & Stores ---
  const { t, locale } = useI18n({ useScope: 'global' })
  const route = useRoute()
  const router = useRouter()

  const categoriesStore = useCAStore()
  const { categories } = storeToRefs(categoriesStore)

  const productsStore = usePRStore()
  const { products, paging } = storeToRefs(productsStore)

  // --- State ---
  const isLoading = ref(false)

  // --- Computed ---
  const selectedCategory = computed(() => {
    const itemId = route.params.id
    for (const category of categories.value) {
      if (category.link === itemId) return category
      if (category.sub && category.sub.length > 0) {
        const isChild = category.sub.find(sub => sub.link === itemId)
        if (isChild) return category
      }
    }
    return {}
  })

  const pageTitle = computed(() => {
    if (selectedCategory.value?.title) {
      return selectedCategory.value.title[locale.value]
    }
    return t('title.CATEGORY')
  })

  // --- Actions (Must be above the Watcher!) ---
  const handleCardClick = (type, id) => {
    if (type === 'category') {
      router.push(`/category/${id}`)
    } else {
      router.push(`/product/${id}`)
    }
  }

  const loadData = async (filterParams, append = false) => {
    if (!append) products.value = []
    isLoading.value = true

    try {
      await productsStore.fetchProducts(filterParams, append)
    } catch (e) {
      console.error('Failed to load category data', e)
    } finally {
      isLoading.value = false
    }
  }

  const loadMore = () => {
    const nextPage = paging.value.currentPage + 1
    const filters = {
      category: route.params.id,
      page: nextPage,
      ...route.query
    }
    loadData(filters, true)
  }

  // --- Watchers ---
  watch(
    [() => route.params.id, () => route.query],
    ([newId, newQuery]) => {
      const filters = {
        category: newId,
        page: 1,
        ...newQuery
      }
      loadData(filters, false) // loadData now safely exists!
    },
    { immediate: true }
  )
</script>
