<template>
  <div
    class="row full-width"
    v-if="localProduct && localProduct.locales && localProduct.locales[locale]"
  >
    <q-expansion-item class="col-12" expand-separator icon="perm_identity">
      <template v-slot:header>
        <q-item-section avatar>
          <q-img
            :src="localProduct.locales[locale]?.images?.[0]"
            :error-src="noImage"
            style="height: 40px; width: 40px; border-radius: 4px; object-fit: cover"
          />
        </q-item-section>

        <q-item-section>
          <q-item-label class="text-weight-bold text-blue-grey">
            {{ localProduct.locales[locale].title }}
          </q-item-label>

          <q-item-label caption>
            <div class="row items-center q-gutter-x-xs q-py-xs">
              <q-chip dense outline square color="primary" class="no-border-radius">
                <q-rating
                  readonly
                  :model-value="localProduct.rating"
                  size="1em"
                  :max="5"
                  color="primary"
                />
              </q-chip>

              <q-chip
                dense
                outline
                square
                :color="localProduct.discountPrice ? 'negative' : 'primary'"
                text-color="white"
                class="no-border-radius text-weight-bold"
              >
                {{ formatPrice(localProduct.discountPrice || localProduct.price) }}
                {{ currencySymbol }}
              </q-chip>

              <q-chip
                dense
                outline
                square
                color="primary"
                icon="visibility"
                class="no-border-radius"
              >
                {{ localProduct.views || 0 }}
              </q-chip>

              <q-chip dense outline square color="primary" icon="sell" class="no-border-radius">
                {{ localProduct.sold || 0 }}
              </q-chip>

              <q-space />

              <q-chip
                icon="calendar_today"
                dense
                outline
                square
                color="primary"
                text-color="white"
                class="no-border-radius"
              >
                {{ shortDate }}
              </q-chip>
            </div>
          </q-item-label>
        </q-item-section>
      </template>

      <q-card>
        <q-card-section>
          <div class="row q-col-gutter-sm">
            <div class="col-12 row justify-between items-center q-mb-sm">
              <q-chip dense outline square color="primary" class="text-caption no-border-radius">
                {{ createdDate }}
              </q-chip>
              <q-chip
                clickable
                @click="handleCopyId"
                dense
                square
                color="primary"
                text-color="white"
                class="text-caption no-border-radius"
              >
                {{ $t('admin.FIELD_ID') }}: {{ localProduct.id }}
                <q-icon name="content_copy" size="12px" class="q-ml-sm" />
              </q-chip>
            </div>

            <div class="col-12">
              <q-input
                dense
                outlined
                stack-label
                :label="$t('admin.LBL_TITLE')"
                v-model="localProduct.locales[locale].title"
                bg-color="white"
              />
            </div>

            <div class="col-12">
              <q-input
                dense
                outlined
                stack-label
                :label="$t('admin.LBL_DESC')"
                v-model="localProduct.locales[locale].description"
                bg-color="white"
                type="textarea"
                rows="2"
              />
            </div>

            <div class="col-12 col-md-6">
              <CurrencyInput
                class="full-width"
                :label="$t('admin.LBL_PRICE')"
                v-model="localProduct.price"
              />
            </div>

            <div class="col-12 col-md-6">
              <CurrencyInput
                class="full-width"
                :label="$t('admin.LBL_PRICE_DISCOUNT')"
                v-model="localProduct.discountPrice"
                clearable
              />
            </div>

            <div class="col-12">
              <q-input
                dense
                outlined
                stack-label
                :label="$t('admin.LBL_QTY_MAIN')"
                v-model.number="localProduct.quantity"
                type="number"
                bg-color="white"
              />
            </div>

            <div class="col-12">
              <q-expansion-item class="border-1px-primary" expand-separator icon="image">
                <template v-slot:header>
                  <div class="row items-center full-width">
                    <div class="text-overline text-uppercase q-mr-md">
                      {{ $t('admin.LBL_IMAGES') }}
                    </div>
                    <div class="row q-gutter-x-xs">
                      <q-img
                        v-for="(img, idx) in localProduct.locales[locale].images"
                        :key="idx"
                        :src="img"
                        :error-src="noImage"
                        style="
                          width: 30px;
                          height: 30px;
                          border: 1px solid #ccc;
                          border-radius: 4px;
                        "
                      />
                    </div>
                  </div>
                </template>

                <div class="q-pa-md bg-grey-1">
                  <q-file
                    v-model="selectedImage"
                    outlined
                    dense
                    bg-color="white"
                    :label="$t('admin.LBL_IMAGES', 'Select image to upload...')"
                    accept=".jpg, .jpeg, .png, .webp, .gif, image/*"
                    @update:model-value="uploadImage"
                    :disable="isUploadingImage"
                    class="q-mb-md"
                  >
                    <template v-slot:prepend>
                      <q-icon name="cloud_upload" color="primary" />
                    </template>
                    <template v-slot:append>
                      <q-spinner v-if="isUploadingImage" color="primary" size="1.5em" />
                    </template>
                  </q-file>

                  <div
                    class="row q-col-gutter-sm"
                    v-if="
                      localProduct.locales[locale].images &&
                      localProduct.locales[locale].images.length > 0
                    "
                  >
                    <div
                      v-for="(img, idx) in localProduct.locales[locale].images"
                      :key="idx"
                      class="col-auto relative-position"
                    >
                      <q-img
                        :src="img"
                        :error-src="noImage"
                        style="
                          width: 100px;
                          height: 100px;
                          border-radius: 8px;
                          border: 1px solid #ccc;
                        "
                        class="shadow-2 bg-white"
                      />
                      <q-btn
                        round
                        dense
                        color="negative"
                        icon="close"
                        size="sm"
                        class="absolute-top-right shadow-3"
                        style="top: -8px; right: -8px; z-index: 2"
                        @click="removeSpecificImage(idx)"
                      />
                    </div>
                  </div>

                  <div v-else class="text-caption text-grey-6 text-center q-py-md">
                    {{ $t('admin.NO_IMAGES_UPLOADED', 'No images uploaded yet.') }}
                  </div>
                </div>
              </q-expansion-item>
            </div>

            <div class="col-12">
              <q-expansion-item class="border-1px-primary" expand-separator icon="straighten">
                <template v-slot:header>
                  <div class="row items-center full-width">
                    <div class="text-overline text-uppercase q-mr-md">
                      {{ $t('admin.LBL_SIZES') }}
                    </div>
                    <div class="row q-gutter-x-xs">
                      <q-badge
                        v-for="(s, i) in localProduct.sizes"
                        :key="i"
                        color="grey-3"
                        text-color="black"
                      >
                        {{ s.size }}
                      </q-badge>
                    </div>
                  </div>
                </template>
                <div class="q-pa-md">
                  <div class="row q-gutter-sm q-mb-sm">
                    <q-btn
                      size="sm"
                      color="primary"
                      icon="add"
                      :label="$t('admin.BTN_ADD_SIZE', 'Add Size')"
                      @click="addSize"
                    />
                    <q-btn
                      size="sm"
                      color="negative"
                      icon="remove"
                      :label="$t('admin.BTN_REMOVE_LAST', 'Remove Last')"
                      @click="removeSize"
                      flat
                    />
                  </div>
                  <div
                    v-for="(sizeObj, idx) in localProduct.sizes"
                    :key="idx"
                    class="row q-col-gutter-sm q-mb-sm border-bottom-dashed"
                  >
                    <div class="col-6">
                      <q-input
                        dense
                        outlined
                        :label="$t('admin.LBL_LABEL')"
                        v-model="sizeObj.size"
                      />
                    </div>
                    <div class="col-6">
                      <q-input
                        dense
                        outlined
                        type="number"
                        :label="$t('admin.LBL_QTY_SIZE')"
                        v-model.number="sizeObj.qty"
                      />
                    </div>
                  </div>
                </div>
              </q-expansion-item>
            </div>

            <div class="col-12">
              <q-expansion-item class="border-1px-primary" expand-separator icon="list">
                <template v-slot:header>
                  <div class="text-overline text-uppercase">
                    {{ $t('admin.SPEC_FULL') }} ({{
                      localProduct.locales[locale].specifications.length
                    }})
                  </div>
                </template>
                <div class="q-pa-md">
                  <div class="row q-gutter-sm q-mb-sm">
                    <q-btn size="sm" color="primary" icon="add" @click="addSpec" />
                    <q-btn size="sm" color="negative" icon="remove" @click="removeSpec" flat />
                  </div>
                  <div
                    v-for="(spec, idx) in localProduct.locales[locale].specifications"
                    :key="idx"
                    class="q-mb-md p-3 bg-grey-1"
                  >
                    <q-input
                      dense
                      outlined
                      class="q-mb-xs"
                      :label="$t('admin.LBL_TITLE')"
                      v-model="spec.title"
                      bg-color="white"
                    />
                    <q-input
                      dense
                      outlined
                      :label="$t('admin.LBL_DESC')"
                      v-model="spec.description"
                      bg-color="white"
                    />
                  </div>
                </div>
              </q-expansion-item>
            </div>

            <div class="col-12">
              <q-expansion-item class="border-1px-primary" expand-separator icon="info">
                <template v-slot:header>
                  <div class="text-overline text-uppercase">
                    {{ $t('admin.INFO_FULL') }} ({{
                      localProduct.locales[locale].declarations?.length || 0
                    }})
                  </div>
                </template>
                <div class="q-pa-md">
                  <div class="row q-gutter-sm q-mb-sm">
                    <q-btn
                      size="sm"
                      color="primary"
                      icon="add"
                      @click="addDecl"
                      :label="$t('admin.BTN_ADD_INFO', 'Add Info')"
                    />
                    <q-btn size="sm" color="negative" icon="remove" @click="removeDecl" flat />
                  </div>
                  <div
                    v-for="(decl, idx) in localProduct.locales[locale].declarations"
                    :key="idx"
                    class="q-mb-md p-3 bg-grey-1"
                  >
                    <q-input
                      dense
                      outlined
                      class="q-mb-xs"
                      :label="$t('admin.LBL_TITLE')"
                      v-model="decl.title"
                      bg-color="white"
                    />
                    <q-input
                      dense
                      outlined
                      :label="$t('admin.LBL_DESC')"
                      v-model="decl.description"
                      bg-color="white"
                    />
                  </div>
                </div>
              </q-expansion-item>
            </div>

            <div class="col-12">
              <q-expansion-item class="border-1px-primary" expand-separator icon="category">
                <template v-slot:header>
                  <div class="row items-center full-width">
                    <div class="text-overline text-uppercase q-mr-md">
                      {{ $t('admin.NAV_CATS') }}
                    </div>
                    <div class="text-caption text-grey">{{ selectedLabels.join(', ') }}</div>
                  </div>
                </template>
                <div class="q-pa-md">
                  <q-tree
                    :nodes="categoryTreeData"
                    node-key="id"
                    label-key="label"
                    children-key="sub"
                    tick-strategy="strict"
                    :ticked="localProduct.categories"
                    @update:ticked="handleCategoryTick"
                  />
                </div>
              </q-expansion-item>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>
  </div>

  <div v-else class="row full-width">
    <q-expansion-item
      class="col-12"
      icon="error"
      :label="$t('admin.PROD_DATA_CORRUPT', 'Corrupted Data')"
      header-class="text-negative bg-red-1"
    />
  </div>
</template>

<script setup>
  // --- Imports ---
  import api from 'src/utils/api'
  import { useNotifyStore } from 'src/stores/notify.store'
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useCAStore } from 'src/stores/categories.store'
  import { copyToClipboard, date } from 'quasar'
  import { nanoid } from 'nanoid'

  // Stores & Assets
  import { useAdminStore } from 'src/stores/admin.store'
  import { useUIStore } from 'src/stores/ui.store'
  import noImage from 'src/assets/no.image.1.1.png'
  import CurrencyInput from 'src/components/inputs/CurrencyInput.vue'

  // --- Setup ---
  const { locale } = useI18n({ useScope: 'global' })
  const adminStore = useAdminStore()
  const uiStore = useUIStore()
  const categoriesStore = useCAStore()
  const emit = defineEmits(['change'])
  const notifyStore = useNotifyStore()
  const { t } = useI18n({ useScope: 'global' })

  const props = defineProps({
    product: { type: Object, required: true }
  })

  // --- State ---
  const localProduct = ref(props.product)

  // --- Watchers ---
  watch(
    () => props.product,
    newVal => {
      localProduct.value = newVal
    }
  )

  watch(
    localProduct,
    (newVal, oldVal) => {
      if (newVal === oldVal) {
        emit('change', localProduct.value.id)
      }
    },
    { deep: true }
  )

  // --- Computed Helpers ---
  const currencySymbol = computed(() => uiStore.ui[0]?.currency || '')

  const createdDate = computed(() =>
    date.formatDate(localProduct.value.createdAt, 'DD MMMM YYYY, HH:mm')
  )

  const shortDate = computed(() => date.formatDate(localProduct.value.createdAt, 'DD/MM/YYYY'))

  // --- Computed: Categories ---
  const categoryTreeData = computed(() => {
    const transform = nodes => {
      return nodes.map(node => ({
        ...node,
        label: node.title?.[locale.value] || node.title?.['en-US'] || node.id,
        sub: node.sub ? transform(node.sub) : []
      }))
    }

    // 🌟 THE FIX: Prioritize the adminStore (which has all 8 categories)!
    const sourceCategories = adminStore.adminData?.categories?.length
      ? adminStore.adminData.categories
      : categoriesStore.categories || []

    return transform(sourceCategories)
  })

  const selectedLabels = computed(() => {
    const ids = localProduct.value.categories || []
    const labels = []

    const find = nodes => {
      for (const node of nodes) {
        if (ids.includes(node.id)) labels.push(node.label)
        if (node.sub) find(node.sub)
      }
    }

    find(categoryTreeData.value)
    return labels
  })

  // --- Actions ---
  const handleCopyId = () => {
    if (!localProduct.value.id) return
    copyToClipboard(localProduct.value.id)
      .then(() => null)
      .catch(() => {})
  }

  const formatPrice = val => {
    if (val === undefined || val === null) return '-'
    return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }).format(val)
  }

  // --- Category Logic (Smart Bidirectional Sync) ---
  const handleCategoryTick = tickedIds => {
    const currentSet = new Set(localProduct.value.categories || [])
    const newSet = new Set(tickedIds)

    let changedId = null
    let isAdded = false

    for (const id of newSet) {
      if (!currentSet.has(id)) {
        changedId = id
        isAdded = true
        break
      }
    }

    if (!changedId) {
      for (const id of currentSet) {
        if (!newSet.has(id)) {
          changedId = id
          isAdded = false
          break
        }
      }
    }

    if (!changedId) {
      localProduct.value.categories = tickedIds
      return
    }

    const finalSelection = new Set(currentSet)

    const findNodeData = (nodes, targetId, path = []) => {
      for (const node of nodes) {
        if (node.id === targetId) return { node, path }
        if (node.sub) {
          const result = findNodeData(node.sub, targetId, [...path, node])
          if (result) return result
        }
      }
      return null
    }

    const getDescendantIds = (node, results = []) => {
      if (node.sub) {
        node.sub.forEach(child => {
          results.push(child.id)
          getDescendantIds(child, results)
        })
      }
      return results
    }

    const targetData = findNodeData(categoryTreeData.value, changedId)

    if (targetData) {
      const { node, path } = targetData
      const descendants = getDescendantIds(node)

      if (isAdded) {
        finalSelection.add(changedId)
        descendants.forEach(id => finalSelection.add(id))
        path.forEach(p => finalSelection.add(p.id))
      } else {
        finalSelection.delete(changedId)
        descendants.forEach(id => finalSelection.delete(id))

        const pathReversed = [...path].reverse()
        for (const parent of pathReversed) {
          const hasSelectedChildren =
            parent.sub && parent.sub.some(child => finalSelection.has(child.id))

          if (!hasSelectedChildren) {
            finalSelection.delete(parent.id)
          } else {
            break
          }
        }
      }
    }

    localProduct.value.categories = Array.from(finalSelection)
  }

  // --- Array Manipulation ---

  // Arrays: Images
  // --- CLOUDINARY UPLOAD LOGIC ---
  const selectedImage = ref(null)
  const isUploadingImage = ref(false)

  const uploadImage = async file => {
    if (!file) return

    isUploadingImage.value = true
    const formData = new FormData()
    formData.append('image', file)

    try {
      // Send the physical file to your backend upload route
      const response = await api.post('/auth/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data && response.data.url) {
        // Safety check: ensure array exists
        if (!localProduct.value.locales[locale.value].images) {
          localProduct.value.locales[locale.value].images = []
        }

        // Append the new Cloudinary URL to the product!
        localProduct.value.locales[locale.value].images.push(response.data.url)
        notifyStore.notify(200, t('msgSystem.IMG_UPLOAD_SUCCESS', 'Image uploaded successfully!'))
      }
    } catch (error) {
      console.error('Upload failed:', error)
      notifyStore.notify(
        500,
        t('msgSystem.IMG_UPLOAD_FAILED', 'Failed to upload image. Please try again.')
      )
    } finally {
      // Clear the file input so they can upload another one
      selectedImage.value = null
      isUploadingImage.value = false
    }
  }

  const removeSpecificImage = async idx => {
    const imageUrl = localProduct.value.locales[locale.value].images[idx]

    // 1. Remove it visually right away so the UI feels fast
    localProduct.value.locales[locale.value].images.splice(idx, 1)

    // 2. Quietly tell the backend to delete it from Cloudinary
    try {
      if (imageUrl && imageUrl.includes('cloudinary.com')) {
        await api.post('/auth/upload/delete', { imageUrl })
      }
    } catch {
      console.warn('Failed to clean up image from Cloudinary')
    }
  }

  // 🌟 REFACTOR: Arrays: Sizes (Now safely modifies the root array!)
  const addSize = () => {
    const newId = nanoid()
    if (!localProduct.value.sizes) localProduct.value.sizes = []
    localProduct.value.sizes.push({ id: newId, size: '', qty: 0 })
  }
  const removeSize = () => {
    if (localProduct.value.sizes && localProduct.value.sizes.length > 0) {
      localProduct.value.sizes.pop()
    }
  }

  // Arrays: Specifications
  const addSpec = () => {
    localProduct.value.locales[locale.value].specifications.push({ title: '', description: '' })
  }
  const removeSpec = () => {
    localProduct.value.locales[locale.value].specifications.pop()
  }

  // Arrays: Declarations
  const addDecl = () => {
    if (!localProduct.value.locales[locale.value].declarations) {
      localProduct.value.locales[locale.value].declarations = []
    }
    localProduct.value.locales[locale.value].declarations.push({ title: '', description: '' })
  }
  const removeDecl = () => {
    localProduct.value.locales[locale.value].declarations?.pop()
  }
</script>

<style lang="scss" scoped>
  .border-1px-primary {
    border: 1px solid rgba(0, 0, 0, 0.12);
    border-left: 4px solid $primary;
  }

  .border-bottom-dashed {
    border-bottom: 1px dashed #e0e0e0;
    padding-bottom: 8px;
  }
</style>
