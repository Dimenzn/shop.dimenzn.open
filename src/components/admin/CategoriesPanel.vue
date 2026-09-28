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
        <div class="full-width text-center">{{ categories.length }} {{ $t('admin.NAV_CATS') }}</div>
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
              outline
              icon="download"
              :label="$t('admin.BTN_IMPORT')"
              @click="triggerImport"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
            <input
              type="file"
              ref="fileInput"
              accept=".json"
              style="display: none"
              @change="handleImport"
            />
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
              @click="fetchData()"
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

    <div class="row q-mb-md q-pr-md items-center">
      <div class="col-12 col-md-auto">
        <q-btn
          color="primary"
          icon="add"
          :label="$t('admin.CAT_ADD')"
          @click="addCategory"
          dense
          outline
          class="full-width"
        />
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area
        class="fit q-pr-md"
        :thumb-style="{ width: '8px', borderRadius: '4px' }"
        :content-style="{ width: '100%' }"
      >
        <div
          v-if="!isLoading && categories.length === 0"
          class="column items-center justify-center text-grey-6 q-pa-xl"
          style="min-height: 40vh"
        >
          <q-icon name="category" size="4em" class="q-mb-md text-grey-4" />
          <div class="text-h6">{{ $t('msgSystem.NO_DATA_CATEGORY') }}</div>
        </div>

        <q-card
          v-for="(cat, index) in categories"
          :key="cat.id"
          class="q-mb-md bg-grey-1 border-primary"
          style="overflow: hidden"
          bordered
          flat
        >
          <q-card-section>
            <div class="row q-col-gutter-sm items-center">
              <div class="col-auto column q-gutter-y-xs">
                <q-btn
                  dense
                  flat
                  round
                  icon="arrow_drop_up"
                  size="sm"
                  color="primary"
                  :disable="index === 0"
                  @click="moveCategory(index, 'up')"
                >
                  <q-tooltip>{{ $t('admin.LBL_MOVE_UP') }}</q-tooltip>
                </q-btn>
                <q-btn
                  dense
                  flat
                  round
                  icon="arrow_drop_down"
                  size="sm"
                  color="primary"
                  :disable="index === categories.length - 1"
                  @click="moveCategory(index, 'down')"
                >
                  <q-tooltip>{{ $t('admin.LBL_MOVE_DOWN') }}</q-tooltip>
                </q-btn>
              </div>

              <div class="col-auto">
                <q-chip square color="primary" text-color="white" :label="index + 1" />
              </div>

              <div class="col-12 col-md">
                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-8">
                    <q-input
                      outlined
                      dense
                      bg-color="white"
                      v-model="cat.title[locale]"
                      :label="$t('admin.LBL_TITLE')"
                      @update:model-value="markDirty"
                    />
                  </div>
                  <div class="col-12 col-sm-4">
                    <q-input
                      outlined
                      dense
                      readonly
                      bg-color="grey-2"
                      v-model="cat.link"
                      :label="$t('admin.FIELD_ID')"
                    >
                      <template v-slot:append>
                        <q-btn
                          round
                          dense
                          flat
                          icon="content_copy"
                          size="sm"
                          @click="copyToClipboard(cat.link)"
                        />
                      </template>
                    </q-input>
                  </div>
                </div>
              </div>

              <div class="col-auto">
                <q-btn flat round color="negative" icon="delete" @click="removeCategory(index)">
                  <q-tooltip>{{ $t('admin.CAT_REMOVE') }}</q-tooltip>
                </q-btn>
              </div>
            </div>
          </q-card-section>

          <q-separator />

          <q-expansion-item
            expand-separator
            icon="subdirectory_arrow_right"
            :label="`${$t('admin.CAT_SUB_LABEL')} (${cat.sub ? cat.sub.length : 0})`"
            header-class="text-primary"
          >
            <q-card-section class="q-pl-lg q-pt-none">
              <div
                v-for="(sub, subIndex) in cat.sub"
                :key="sub.id"
                class="row q-col-gutter-sm q-mb-sm items-center border-bottom-dashed"
              >
                <div class="col-auto column q-gutter-y-xs">
                  <q-btn
                    dense
                    flat
                    round
                    icon="keyboard_arrow_up"
                    size="xs"
                    color="grey-7"
                    :disable="subIndex === 0"
                    @click="moveSubCategory(index, subIndex, 'up')"
                  />
                  <q-btn
                    dense
                    flat
                    round
                    icon="keyboard_arrow_down"
                    size="xs"
                    color="grey-7"
                    :disable="subIndex === cat.sub.length - 1"
                    @click="moveSubCategory(index, subIndex, 'down')"
                  />
                </div>

                <div class="col-auto text-caption text-grey">{{ subIndex + 1 }}.</div>

                <div class="col-12 col-sm">
                  <q-input
                    dense
                    outlined
                    bg-color="white"
                    v-model="sub.title[locale]"
                    :label="$t('admin.CAT_SUB_LABEL')"
                    @update:model-value="markDirty"
                  />
                </div>

                <div class="col-12 col-sm-4">
                  <q-input
                    dense
                    outlined
                    readonly
                    bg-color="grey-2"
                    v-model="sub.link"
                    :label="$t('admin.FIELD_SUB_ID')"
                  >
                    <template v-slot:append>
                      <q-btn
                        round
                        dense
                        flat
                        icon="content_copy"
                        size="sm"
                        @click="copyToClipboard(sub.link)"
                      />
                    </template>
                  </q-input>
                </div>

                <div class="col-auto">
                  <q-btn
                    dense
                    flat
                    round
                    color="negative"
                    icon="close"
                    size="sm"
                    @click="removeSubCategory(index, subIndex)"
                  />
                </div>
              </div>

              <div class="row q-pt-sm">
                <q-btn
                  outline
                  size="sm"
                  color="primary"
                  icon="add"
                  :label="$t('admin.SUB_ADD')"
                  @click="addSubCategory(index)"
                />
              </div>
            </q-card-section>
          </q-expansion-item>
        </q-card>
      </q-scroll-area>
    </div>

    <q-inner-loading :showing="isLoading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup>
  // --- Imports ---
  import { computed, onMounted, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { nanoid } from 'nanoid'
  import { copyToClipboard as quasarCopy, exportFile, date } from 'quasar' // 🌟 Added exportFile & date

  // Stores
  import { useAdminStore } from 'src/stores/admin.store'

  // --- Setup ---
  const { locale } = useI18n({ useScope: 'global' })
  const adminStore = useAdminStore()

  // --- State ---
  const isLoading = ref(false)
  const fileInput = ref(null) // 🌟 Reference to the hidden file input

  // --- Computed ---
  // Safely fallback to an empty array to prevent template rendering errors
  const categories = computed(() => adminStore.adminData?.categories || [])

  /**
   * Evaluates if there are unsaved modifications in the local store.
   */
  const hasChanges = computed(() => {
    return adminStore.modifiedCategories && adminStore.modifiedCategories.size > 0
  })

  const fetchData = async () => {
    isLoading.value = true
    try {
      await adminStore.fetchData()
    } catch (error) {
      console.error('Failed to load categories', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Lifecycle ---
  onMounted(async () => {
    fetchData()
  })

  // --- Actions ---

  /**
   * Flags the store state as dirty to enable the Save button.
   */
  const markDirty = () => {
    if (typeof adminStore.markCategoryAsModified === 'function') {
      adminStore.markCategoryAsModified()
    }
  }

  /**
   * Reorders a main category by swapping positions in the array.
   */
  const moveCategory = (index, direction) => {
    const arr = adminStore.adminData.categories
    if (direction === 'up' && index > 0) {
      ;[arr[index], arr[index - 1]] = [arr[index - 1], arr[index]]
      markDirty()
    } else if (direction === 'down' && index < arr.length - 1) {
      ;[arr[index], arr[index + 1]] = [arr[index + 1], arr[index]]
      markDirty()
    }
  }

  /**
   * Reorders a subcategory by swapping positions in its parent's array.
   */
  const moveSubCategory = (parentIndex, subIndex, direction) => {
    const arr = adminStore.adminData.categories[parentIndex].sub
    if (direction === 'up' && subIndex > 0) {
      ;[arr[subIndex], arr[subIndex - 1]] = [arr[subIndex - 1], arr[subIndex]]
      markDirty()
    } else if (direction === 'down' && subIndex < arr.length - 1) {
      ;[arr[subIndex], arr[subIndex + 1]] = [arr[subIndex + 1], arr[subIndex]]
      markDirty()
    }
  }

  // --- CRUD Operations ---

  const addCategory = () => {
    const id = nanoid()
    adminStore.adminData.categories.push({
      id: id,
      link: id,
      title: getEmptyTitleObj(),
      sub: []
    })
    markDirty()
  }

  const addSubCategory = parentIndex => {
    const id = nanoid()
    // Ensure the sub array exists before pushing
    if (!adminStore.adminData.categories[parentIndex].sub) {
      adminStore.adminData.categories[parentIndex].sub = []
    }
    adminStore.adminData.categories[parentIndex].sub.push({
      id: id,
      link: id,
      title: getEmptyTitleObj()
    })
    markDirty()
  }

  const removeCategory = index => {
    adminStore.adminData.categories.splice(index, 1)
    markDirty()
  }

  const removeSubCategory = (parentIndex, subIndex) => {
    adminStore.adminData.categories[parentIndex].sub.splice(subIndex, 1)
    markDirty()
  }

  const saveLocal = async () => {
    if (!hasChanges.value) return

    isLoading.value = true
    try {
      await adminStore.saveData()
    } catch (error) {
      console.error('Failed to save categories', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- 🌟 Export & Import ---

  const handleExport = () => {
    if (categories.value.length === 0) return

    const timeStamp = date.formatDate(Date.now(), 'YYYY-MM-DD')
    const fileName = `categories_export_${timeStamp}.json`

    // Pretty-print the JSON using standard formatting parameters
    const status = exportFile(
      fileName,
      JSON.stringify(categories.value, null, 2),
      'application/json'
    )
    if (!status) {
      console.error('Browser denied file download.')
    }
  }

  const triggerImport = () => {
    if (fileInput.value) {
      fileInput.value.click()
    }
  }

  const handleImport = event => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const importedData = JSON.parse(e.target.result)

        if (Array.isArray(importedData)) {
          // Replace the current store data and force the save button to activate
          adminStore.adminData.categories = importedData
          markDirty()
        } else {
          console.error('Invalid format: Uploaded file is not an array.')
        }
      } catch (error) {
        console.error('Error parsing JSON upload:', error)
      } finally {
        // Clear the input so the user can import the same file again if they undo
        event.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  // --- Helpers ---

  /**
   * Generates a blank translation object populated with all active system languages.
   */
  const getEmptyTitleObj = () => {
    const titleSet = {}
    const langs = adminStore.adminData.languages || []
    langs.forEach(lang => {
      titleSet[lang.value] = ''
    })
    return titleSet
  }

  /**
   * Copies text to the user's clipboard silently.
   */
  const copyToClipboard = text => {
    quasarCopy(text)
      .then(() => {
        /* Silent success */
      })
      .catch(err => {
        console.warn('Failed to copy', err)
      })
  }
</script>

<style lang="scss" scoped>
  .border-primary {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-left: 5px solid $primary;
  }

  .border-bottom-dashed {
    border-bottom: 1px dashed #e0e0e0;
    padding-bottom: 8px;
  }
</style>
