<template>
  <div class="column full-height q-pa-sm relative-position">
    <div class="row q-mb-md q-pr-md">
      <q-chip
        dense
        outline
        square
        color="primary"
        text-color="white"
        class="col-12 text-overline no-border-radius"
        style="margin-left: 0px"
      >
        <div class="full-width text-center">
          {{ productPaging.rowsNumber || 0 }} {{ $t('admin.HEADER_PRODS') }}
        </div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
          <div class="col-xs-6 col-sm-auto">
            <q-btn-dropdown
              size="sm"
              color="primary"
              text-color="white"
              unelevated
              icon="sort"
              :label="$t('label.SORT_BY')"
              class="full-width full-height rounded-borders text-weight-bold"
            >
              <q-list dense style="min-width: 150px">
                <q-item
                  clickable
                  @click="sortProductsBy('rating')"
                  :active="sortState.column === 'rating'"
                >
                  <q-item-section avatar><q-icon name="star" /></q-item-section>
                  <q-item-section>{{ $t('admin.SORT_RATING', 'Rating') }}</q-item-section>
                </q-item>

                <q-item
                  clickable
                  @click="sortProductsBy('price')"
                  :active="sortState.column === 'price'"
                >
                  <q-item-section avatar><q-icon name="attach_money" /></q-item-section>
                  <q-item-section>{{ $t('admin.SORT_PRICE', 'Price') }}</q-item-section>
                </q-item>

                <q-item
                  clickable
                  @click="sortProductsBy('views')"
                  :active="sortState.column === 'views'"
                >
                  <q-item-section avatar><q-icon name="visibility" /></q-item-section>
                  <q-item-section>{{ $t('admin.SORT_VIEWS', 'Views') }}</q-item-section>
                </q-item>

                <q-item
                  clickable
                  @click="sortProductsBy('sold')"
                  :active="sortState.column === 'sold'"
                >
                  <q-item-section avatar><q-icon name="sell" /></q-item-section>
                  <q-item-section>{{ $t('admin.SORT_SOLD', 'Sold') }}</q-item-section>
                </q-item>

                <q-item
                  clickable
                  @click="sortProductsBy('createdAt')"
                  :active="sortState.column === 'createdAt'"
                >
                  <q-item-section avatar><q-icon name="calendar_today" /></q-item-section>
                  <q-item-section>{{ $t('admin.SORT_DATE', 'Date') }}</q-item-section>
                </q-item>
              </q-list></q-btn-dropdown
            >
          </div>
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              color="secondary"
              unelevated
              icon="upload"
              :label="$t('admin.BTN_EXPORT')"
              @click="handleExport"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              color="primary"
              unelevated
              outline
              icon="refresh"
              :label="$t('admin.BTN_REFRESH')"
              @click="refresh()"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              :color="hasChanges ? 'positive' : 'grey-4'"
              :text-color="hasChanges ? 'white' : 'grey-6'"
              :disable="!hasChanges"
              unelevated
              icon="save"
              :label="$t('admin.BTN_SAVE')"
              @click="saveLocal"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="row q-mb-md q-pr-md justify-between">
      <div class="col-12 col-md-auto">
        <div class="row q-pb-sm items-center">
          <div class="col-12 col-md-auto">
            <div style="min-width: 250px" class="full-width">
              <q-input
                dense
                outlined
                bg-color="white"
                v-model="searchProductsModel"
                :label="$t('admin.PROD_SEARCH_HINT')"
                @keydown.enter="handleSearch"
                clearable
                @clear="handleSearch"
                class="full-width"
              >
                <template v-slot:append>
                  <q-icon name="search" class="cursor-pointer" @click="handleSearch" />
                </template>
              </q-input>
            </div>
          </div>

          <div class="col-12 col-md-auto q-pa-xs"></div>

          <div class="col-12 col-md-auto">
            <div class="row items-center q-gutter-x-xs no-wrap full-width">
              <q-pagination
                v-model="currentPage"
                :max="totalPages"
                :max-pages="5"
                boundary-numbers
                boundary-links
                direction-links
                color="primary"
                size="sm"
                dense
                @update:model-value="changePage"
              />
              <q-input
                dense
                outlined
                v-model.number="jumpPageModel"
                type="number"
                style="width: 60px"
                bg-color="white"
                class="text-center"
                :min="1"
                :max="totalPages"
                @keydown.enter="handleJumpToPage"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md" :content-style="{ width: '100%' }">
        <div v-if="productsData.length > 0">
          <div
            class="row q-mb-md productBox relative-position"
            v-for="product in productsData"
            :key="product.id"
            :class="{
              'modified-border': modifiedIds.has(product.id),
              'deleted-opacity': deletedIds.has(product.id)
            }"
          >
            <div
              v-if="deletedIds.has(product.id)"
              class="deleted-overlay absolute-full row justify-center items-center"
              style="z-index: 20"
            >
              <q-btn
                color="white"
                text-color="black"
                icon="undo"
                :label="$t('admin.BTN_RESTORE')"
                @click="handleToggleDelete(product.id)"
              />
            </div>

            <q-btn
              v-else
              icon="close"
              color="negative"
              size="sm"
              flat
              round
              class="delete-button"
              style="z-index: 10"
              @click="handleToggleDelete(product.id)"
            >
              <q-tooltip>{{ $t('admin.BTN_MARK_DELETE') }}</q-tooltip>
            </q-btn>

            <ProductScope :product="product" @change="handleProductChange(product.id)" />
          </div>
        </div>

        <div v-else-if="!loading" class="text-center text-grey q-mt-lg">
          <q-icon name="search_off" size="4em" class="q-mb-md text-grey-4" />
          <div class="text-h6">{{ $t('msgSystem.NO_PRODUCTS_FOUND') }}</div>
        </div>
      </q-scroll-area>
    </div>

    <q-inner-loading :showing="loading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup>
  // --- Imports ---
  import { ref, computed, onMounted, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'
  import { useQuasar, exportFile, date } from 'quasar'

  // Components
  import ProductScope from 'src/components/admin/productsPanel/ProductScope.vue'

  // Stores
  import { useAdminStore } from 'src/stores/admin.store'

  // --- Setup ---
  const $q = useQuasar()
  const { locale, t } = useI18n({ useScope: 'global' })
  const adminStore = useAdminStore()

  // --- State from Store ---
  const { adminData, productPaging, modifiedIds, deletedIds } = storeToRefs(adminStore)

  // --- Local State ---
  const currentPage = ref(1)
  const jumpPageModel = ref(1)
  const loading = ref(false)
  const searchProductsModel = ref('')

  const sortState = ref({
    column: 'createdAt',
    descending: true
  })

  // --- Computed ---
  // 🌟 MODIFIED: Intercept and filter the products for God Mode!
  const productsData = computed(() => {
    const allProducts = adminData.value?.products || []

    if (adminStore.impersonatedSellerId) {
      return allProducts.filter(product => {
        // Compare the product's sellerId to the God Mode ID
        const sellerIdStr =
          typeof product.sellerId === 'object'
            ? product.sellerId._id?.toString()
            : product.sellerId?.toString()

        return sellerIdStr === adminStore.impersonatedSellerId
      })
    }

    // NORMAL ADMIN MODE: Show everything
    return allProducts
  })

  const totalPages = computed(() => {
    // Safely calculate total pages based on paging config, defaulting to 1
    const rowsNum = productPaging.value?.rowsNumber || 0
    const rowsPerPage = productPaging.value?.rowsPerPage || 10
    return Math.ceil(rowsNum / rowsPerPage) || 1
  })

  const hasChanges = computed(() => {
    return modifiedIds.value?.size > 0 || deletedIds.value?.size > 0
  })

  // --- Data Fetching & Pagination ---

  /**
   * Executes the API call to fetch a specific page of products based on current filters.
   */
  const executeFetch = async page => {
    loading.value = true
    try {
      await adminStore.fetchAdminProducts({
        page: page,
        limit: 10,
        search: searchProductsModel.value,
        sortBy: sortState.value.column,
        order: sortState.value.descending ? 'desc' : 'asc',
        locale: locale.value,
        // 🌟 NEW: Pass the God Mode ID to the backend fetch!
        sellerId: adminStore.impersonatedSellerId || undefined
      })
      currentPage.value = page
      jumpPageModel.value = page
    } catch (error) {
      console.error('Failed to fetch admin products:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Safe wrapper for fetching. If the admin has unsaved changes, it warns them before switching pages.
   */
  const fetchProducts = async (page = 1) => {
    if (hasChanges.value) {
      $q.dialog({
        title: t('admin.DIALOG_UNSAVED_TITLE'),
        message: t('admin.DIALOG_UNSAVED_MSG'),
        cancel: true,
        persistent: true
      }).onOk(() => {
        // Discard local changes and load the requested page
        if (typeof adminStore.clearFlags === 'function') {
          adminStore.clearFlags()
        }
        executeFetch(page)
      })
      return
    }

    // If no changes, proceed normally
    executeFetch(page)
  }

  // --- Actions ---

  const handleProductChange = id => {
    adminStore.markAsModified(id)
  }

  const handleToggleDelete = id => {
    adminStore.toggleDelete(id)
  }

  const saveLocal = async () => {
    if (!hasChanges.value) return
    loading.value = true
    try {
      await adminStore.saveData()
    } catch (error) {
      console.error('Failed to save product changes:', error)
    } finally {
      loading.value = false
    }
  }

  // --- Event Handlers ---

  const handleSearch = () => {
    fetchProducts(1)
  }

  const handleJumpToPage = () => {
    let page = parseInt(jumpPageModel.value)

    // Bound the page number
    if (isNaN(page) || page < 1) page = 1
    if (page > totalPages.value) page = totalPages.value

    jumpPageModel.value = page
    fetchProducts(page)
  }

  const changePage = page => {
    fetchProducts(page)
  }

  const sortProductsBy = key => {
    if (sortState.value.column === key) {
      sortState.value.descending = !sortState.value.descending
    } else {
      sortState.value.column = key
      sortState.value.descending = true
    }
    fetchProducts(1)
  }

  // --- Export ---

  const handleExport = () => {
    if (productsData.value.length === 0) return

    const timeStamp = date.formatDate(Date.now(), 'YYYY-MM-DD')
    const fileName = `products_page_${currentPage.value}_${timeStamp}.json`

    const status = exportFile(fileName, JSON.stringify(productsData.value), 'application/json')
    if (!status) {
      console.error('Browser denied file download.')
    }
  }

  // --- Watchers & Lifecycle ---

  // Refetch if the admin switches the global language (so products fetch with correct locale titles)
  watch(locale, () => {
    fetchProducts(currentPage.value)
  })

  const refresh = async () => {
    await adminStore.fetchData()
    fetchProducts(1)
  }

  onMounted(async () => {
    // 1. Fetch general admin config (categories, languages, etc.)
    await adminStore.fetchData()

    // 2. Fetch the paginated product list
    fetchProducts(1)
  })
</script>

<style lang="scss" scoped>
  .productBox {
    border: 1px solid $primary;
    border-left: 5px solid $primary;
    transition: all 0.3s ease;
  }

  .delete-button {
    position: absolute;
    top: 0px;
    right: 13px;
  }

  .modified-border {
    border: 1px solid $warning;
    border-left: 5px solid $warning;
  }

  .deleted-opacity {
    opacity: 0.6;
    border: 1px dashed $negative;
  }

  .deleted-overlay {
    background: rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(2px);
  }
</style>
