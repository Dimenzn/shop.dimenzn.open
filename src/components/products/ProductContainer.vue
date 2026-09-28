<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); overflow: hidden; border-radius: 16px"
  >
    <div class="col-auto q-mb-sm q-px-sm">
      <q-breadcrumbs class="text-primary text-weight-medium" active-color="dark">
        <template v-slot:separator>
          <q-icon size="1.2em" name="chevron_right" color="primary" />
        </template>
        <q-breadcrumbs-el icon="home" to="/" />

        <template v-if="productData">
          <q-breadcrumbs-el
            v-for="pathEl in breadcrumbPath"
            :key="pathEl.id"
            :label="pathEl.name"
            :to="pathEl.to"
          />
          <q-breadcrumbs-el :label="currentProductTitle" />
        </template>

        <q-breadcrumbs-el v-else label="..." />
      </q-breadcrumbs>
    </div>

    <div class="col relative-position">
      <q-scroll-area class="absolute-full q-pr-sm">
        <div class="row justify-center full-width q-pb-xl">
          <div class="col-12 col-xl-10">
            <div
              v-if="isLoading"
              class="row justify-center items-center q-pa-xl"
              style="height: 50vh"
            >
              <q-spinner color="primary" size="3em" />
            </div>

            <div v-else-if="productData">
              <ProductScope :product="productData" />
            </div>

            <div
              v-else
              class="row flex-center full-width text-center q-pa-xl"
              style="min-height: 50vh"
            >
              <div>
                <q-icon name="search_off" size="6em" color="grey-4" class="q-mb-md" />

                <div class="text-h6 text-grey-8 q-mb-sm">
                  {{ $t('msgSystem.PROD_NOT_FOUND_SINGLE') }}
                </div>

                <div class="text-body2 text-grey-6 q-mb-xl">
                  {{ $t('label.SEARCH_EMPTY') }}
                </div>

                <q-btn
                  rounded
                  unelevated
                  color="primary"
                  icon="storefront"
                  :label="$t('label.GO_HOME')"
                  to="/"
                  class="q-px-lg q-py-sm text-weight-bold"
                />
              </div>
            </div>
          </div>
        </div>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
  import { ref, computed, watch } from 'vue'
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'
  import { storeToRefs } from 'pinia'
  import { useCAStore } from 'src/stores/categories.store'
  import { usePRStore } from 'src/stores/products.store'
  import ProductScope from 'src/components/products/ProductScope.vue'

  const route = useRoute()
  const { locale } = useI18n({ useScope: 'global' })

  const categoriesStore = useCAStore()
  const { categories } = storeToRefs(categoriesStore)

  const productsStore = usePRStore()
  const { products, productsMostPopular, productsNewArrivals } = storeToRefs(productsStore)

  // --- Local State ---
  const productData = ref(null)
  const isLoading = ref(false) // 🚀 FIX: Track loading explicitly!

  // --- The Smart Loader ---
  const loadProduct = async targetId => {
    if (!targetId) return

    isLoading.value = true
    productData.value = null

    try {
      // 1. CACHE CHECK: Look in all available lists in memory
      const cachedProduct =
        products.value.find(p => p.id == targetId) ||
        productsMostPopular.value.find(p => p.id == targetId) ||
        productsNewArrivals.value.find(p => p.id == targetId)

      if (cachedProduct) {
        productData.value = cachedProduct
      } else {
        // 2. NETWORK FETCH: Product not in memory, ask backend
        const fetched = await productsStore.fetchProductById(targetId)
        if (fetched) {
          productData.value = fetched
        }
      }
    } catch (error) {
      console.error('Failed to load product details:', error)
      productData.value = null
    } finally {
      isLoading.value = false // 🚀 FIX: Stop the spinner no matter what happens
    }
  }

  // 🚀 FIX: Combined onMounted and the Watcher into one clean block
  watch(
    () => route.params.id,
    newId => {
      loadProduct(newId)
    },
    { immediate: true }
  )

  // --- Computed Helpers ---

  // 🚀 FIX: Safely extract the title with language fallbacks
  const currentProductTitle = computed(() => {
    if (!productData.value?.locales) return 'Product'

    return (
      productData.value.locales[locale.value]?.title ||
      productData.value.locales['en-US']?.title ||
      Object.values(productData.value.locales)[0]?.title ||
      'Product'
    )
  })

  // --- Breadcrumb Logic ---
  const targetCategoryId = computed(() => {
    return productData.value?.categories?.[0] || null
  })

  const breadcrumbPath = computed(() => {
    const tId = targetCategoryId.value
    const currentLocale = locale.value

    if (!tId || !categories.value || categories.value.length === 0) {
      return []
    }

    const path = getCategoryPath(tId, categories.value)
    if (!path) return []

    return path.map(category => ({
      id: category.id,
      name: category.title[currentLocale] || category.title['en-US'] || 'Category',
      to: `/category/${category.link}`
    }))
  })

  function getCategoryPath(targetId, categoriesList, currentPath = []) {
    for (const category of categoriesList) {
      if (category.id == targetId) {
        return [...currentPath, category]
      }
      if (category.sub && category.sub.length > 0) {
        const foundPath = getCategoryPath(targetId, category.sub, [...currentPath, category])
        if (foundPath) return foundPath
      }
    }
    return null
  }
</script>
