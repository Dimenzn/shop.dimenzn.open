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
          {{ draftsCount }} {{ $t('admin.PROD_HEADER_NEW') }}
        </div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              color="accent"
              unelevated
              icon="download"
              :label="$t('admin.BTN_IMPORT')"
              @click="triggerImport"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              color="secondary"
              unelevated
              icon="upload"
              :label="$t('admin.BTN_EXPORT')"
              :disable="draftsCount === 0"
              @click="exportJSON"
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
              :label="$t('admin.BTN_CLEAR_DRAFTS')"
              @click="clearAllDrafts()"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>

          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              :color="draftsCount !== 0 ? 'positive' : 'grey-4'"
              :text-color="draftsCount !== 0 ? 'white' : 'grey-6'"
              :disable="draftsCount === 0"
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
        <div class="row q-pb-sm">
          <div class="col-12 col-md-auto">
            <div style="min-width: 250px" class="full-width">
              <q-input
                dense
                outlined
                bg-color="white"
                v-model="addProductModel"
                :label="$t('admin.PROD_NAME_PLACEHOLDER')"
                @keydown.enter="addDraftProduct"
                class="full-width"
              >
                <template v-slot:append>
                  <q-btn
                    round
                    dense
                    flat
                    icon="add_circle"
                    color="positive"
                    @click="addDraftProduct"
                  >
                    <q-tooltip>{{ $t('admin.PROD_ADD') }}</q-tooltip>
                  </q-btn>
                </template>
              </q-input>
            </div>
          </div>

          <div class="col-12 col-md-auto q-pa-xs"></div>

          <div class="col-12 col-md-auto">
            <div style="min-width: 250px" class="full-width">
              <q-input
                dense
                outlined
                bg-color="white"
                v-model="searchModel"
                :label="$t('admin.PROD_SEARCH_HINT')"
                clearable
                class="full-width"
              >
                <template v-slot:append>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-auto">
        <div class="row items-center justify-end q-gutter-x-sm no-wrap">
          <input
            type="file"
            ref="fileInputRef"
            accept=".json"
            style="display: none"
            @change="onFileImport"
          />
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md" :content-style="{ width: '100%' }">
        <div v-if="displayList.length > 0">
          <div
            class="row q-mb-md productBox relative-position"
            v-for="product in displayList"
            :key="product.id"
          >
            <q-btn
              icon="close"
              color="negative"
              size="sm"
              flat
              round
              class="delete-button q-ma-xs absolute-top-right"
              style="z-index: 10"
              @click="removeDraftById(product.id)"
            >
              <q-tooltip>{{ $t('admin.BTN_DELETE') }}</q-tooltip>
            </q-btn>

            <ProductScope :product="product" class="full-width" />
          </div>
        </div>

        <div
          v-else
          class="column items-center justify-center text-grey-6 q-pa-xl"
          style="min-height: 40vh"
        >
          <q-icon
            :name="draftsCount === 0 ? 'post_add' : 'search_off'"
            size="4em"
            class="q-mb-md text-grey-4"
          />
          <div class="text-h6">
            {{
              draftsCount === 0 ? $t('admin.MSG_NO_DRAFTS_YET') : $t('admin.MSG_NO_DRAFTS_MATCH')
            }}
          </div>
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
  import { ref, computed, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useI18n } from 'vue-i18n'
  import { useQuasar, exportFile, date } from 'quasar'
  import { nanoid } from 'nanoid'

  // Stores
  import { useAdminStore } from 'src/stores/admin.store'
  import { useNotifyStore } from 'src/stores/notify.store'

  // Components
  import ProductScope from 'src/components/admin/productsPanel/ProductScope.vue'

  // --- Setup ---
  const { locale, t } = useI18n({ useScope: 'global' })
  const $q = useQuasar()

  const adminStore = useAdminStore()
  const notifyStore = useNotifyStore()

  // Destructure reactive state from store
  const { adminData } = storeToRefs(adminStore)

  // --- State ---
  const searchModel = ref('')
  const addProductModel = ref('')
  const fileInputRef = ref(null)
  const loading = ref(false)

  // --- Computed ---
  const draftsCount = computed(() => adminData.value?.newProducts?.length || 0)

  /**
   * Returns a filtered and reversed list of draft products so the newest additions appear at the top.
   */
  const displayList = computed(() => {
    if (!adminData.value?.newProducts) return []

    let list = [...adminData.value.newProducts]

    if (searchModel.value) {
      const term = searchModel.value.toLowerCase()
      list = list.filter(
        p =>
          p.id.toLowerCase().includes(term) ||
          p.locales[locale.value]?.title?.toLowerCase().includes(term)
      )
    }

    return list.reverse()
  })

  // --- Lifecycle ---
  onMounted(async () => {
    // Prevent fetching if data already exists in store memory
    if (draftsCount.value === 0) {
      loading.value = true
      try {
        await adminStore.fetchData()
      } catch (error) {
        console.error('Failed to load drafts:', error)
      } finally {
        loading.value = false
      }
    }
  })

  // --- Actions ---

  /**
   * Generates a new blank product draft and adds it to the list.
   */
  const addDraftProduct = () => {
    if (!addProductModel.value.trim()) return

    const newProduct = {
      id: nanoid(),
      rating: 0,
      views: 0,
      sold: 0,
      categories: [],
      locales: {
        [locale.value]: {
          quantity: 0,
          title: addProductModel.value.trim(),
          description: '',
          images: [],
          sizes: [],
          specifications: [],
          declarations: []
        }
      },
      createdAt: new Date().toISOString()
    }

    // Unshift puts it at the beginning of the array
    adminStore.adminData.newProducts.unshift(newProduct)
    addProductModel.value = ''
  }

  const removeDraftById = id => {
    const index = adminStore.adminData.newProducts.findIndex(p => p.id === id)
    if (index !== -1) {
      adminStore.adminData.newProducts.splice(index, 1)
    }
  }

  /**
   * Prompts the user before wiping out all staged drafts.
   */
  const clearAllDrafts = () => {
    $q.dialog({
      title: t('admin.DIALOG_CONFIRM_TITLE'),
      message: t('admin.DIALOG_CLEAR_DRAFTS_MSG'),
      cancel: true,
      persistent: true
    }).onOk(() => {
      adminStore.adminData.newProducts = []
    })
  }

  /**
   * Saves the current drafts to the database.
   */
  const saveLocal = async () => {
    if (draftsCount.value === 0) return
    loading.value = true

    try {
      await adminStore.saveData()
    } catch (error) {
      console.error('Failed to save drafts:', error)
    } finally {
      loading.value = false
    }
  }

  // --- Import / Export ---

  /**
   * Downloads the current list of drafts as a JSON file.
   */
  const exportJSON = () => {
    if (draftsCount.value === 0) return

    const fileName = `products_draft_${date.formatDate(Date.now(), 'YYYY-MM-DD_HH-mm')}.json`
    const status = exportFile(
      fileName,
      JSON.stringify(adminStore.adminData.newProducts),
      'application/json'
    )

    if (!status) {
      console.error('Browser denied file download.')
      // Optional: notifyStore.notify(500, 'msgSystem.BROWSER_DENIED')
    }
  }

  const triggerImport = () => {
    if (fileInputRef.value) {
      fileInputRef.value.click()
    }
  }

  /**
   * Reads a JSON file from the user's computer and parses it into the draft list.
   */
  const onFileImport = event => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = JSON.parse(e.target.result)
        if (Array.isArray(parsed)) {
          adminStore.adminData.newProducts.push(...parsed)
          notifyStore.notify(200, 'admin.MSG_IMPORTED_DRAFTS')
        } else {
          throw new Error('Parsed JSON is not an array')
        }
      } catch (err) {
        console.error('Invalid JSON file:', err)
        notifyStore.notify(500, 'msgSystem.INVALID_JSON') // Assuming you have an INVALID_JSON key
      } finally {
        event.target.value = '' // Reset the input so the same file can be uploaded again if needed
      }
    }
    reader.readAsText(file)
  }
</script>

<style lang="scss" scoped>
  .productBox {
    border: 1px solid $primary;
    border-left: 5px solid $primary;
  }

  .delete-button {
    position: absolute;
    top: 0px;
    right: 8px;
  }
</style>
