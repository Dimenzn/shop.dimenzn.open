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
        <div class="full-width text-center">{{ adsList.length }} {{ $t('admin.HEADER_ADS') }}</div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
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
        <div style="min-width: 250px" class="full-width">
          <q-input
            v-model="addAdModel"
            dense
            outlined
            bg-color="white"
            :label="$t('admin.AD_NAME_PLACEHOLDER')"
            @keydown.enter="handleAddAd"
            class="full-width"
          >
            <template v-slot:append>
              <q-btn round dense flat icon="add_circle" color="positive" @click="handleAddAd">
                <q-tooltip>{{ $t('admin.AD_ADD') }}</q-tooltip>
              </q-btn>
            </template>
          </q-input>
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area class="fit q-pr-md" :content-style="{ width: '100%' }">
        <div v-if="adsList.length > 0">
          <div class="row q-mb-md productBox relative-position" v-for="ad in adsList" :key="ad.id">
            <q-btn
              icon="close"
              color="negative"
              size="sm"
              flat
              round
              class="delete-button"
              style="z-index: 10"
              @click="removeAdById(ad.id)"
            >
              <q-tooltip>{{ $t('admin.BTN_DELETE') }}</q-tooltip>
            </q-btn>

            <AdScope :ad="ad" @change="markModified(ad.id)" class="full-width" />
          </div>
        </div>

        <div
          v-else
          class="column items-center justify-center text-grey-6 q-pa-xl"
          style="min-height: 40vh"
        >
          <q-icon name="campaign" size="4em" class="q-mb-md text-grey-4" />
          <div class="text-h6">{{ $t('msgSystem.NO_DATA_ADS') }}</div>
        </div>
      </q-scroll-area>
    </div>

    <q-inner-loading :showing="isLoading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup>
  // --- Imports ---
  import { ref, computed, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { nanoid } from 'nanoid'

  // Components
  import AdScope from 'src/components/admin/adsPanel/AdScope.vue'

  // Stores
  import { useAdminStore } from 'src/stores/admin.store'

  // --- Setup ---
  const { locale } = useI18n({ useScope: 'global' })
  const adminStore = useAdminStore()

  // --- State ---
  const isLoading = ref(false)
  const addAdModel = ref('')

  // --- Computed ---
  const adsList = computed(() => adminStore.adminData.ads || [])
  const hasChanges = computed(() => adminStore.modifiedAds.size > 0)

  const fetchData = async () => {
    //if (adsList.value.length === 0) {
    isLoading.value = true
    try {
      await adminStore.fetchData()
    } catch (error) {
      console.error('Failed to load ads:', error)
    } finally {
      isLoading.value = false
    }
    //}
  }

  // --- Lifecycle ---
  onMounted(async () => {
    fetchData()
  })

  // --- Actions ---

  /**
   * Creates a new Ad placeholder and prepends it to the list.
   */
  const handleAddAd = () => {
    if (!addAdModel.value.trim()) return

    const newId = nanoid()
    const newAd = {
      id: newId,
      locales: {
        [locale.value]: {
          title: addAdModel.value.trim(),
          link: '#',
          image: '#'
        }
      }
    }

    // Unshift adds the new item to the top of the array
    adminStore.adminData.ads.unshift(newAd)

    // Explicitly mark as modified so the Save button activates
    markModified(newId)

    // Reset input
    addAdModel.value = ''
  }

  /**
   * Removes an Ad by ID from the local state.
   */
  const removeAdById = id => {
    const index = adminStore.adminData.ads.findIndex(ad => ad.id === id)
    if (index !== -1) {
      adminStore.adminData.ads.splice(index, 1)

      // Explicitly mark as modified so the backend knows to delete it upon save
      markModified(id)
    }
  }

  /**
   * Emitted by child components when their content is edited.
   */
  const markModified = id => {
    adminStore.markAdAsModified(id)
  }

  /**
   * Sends all staged changes to the backend.
   */
  const saveLocal = async () => {
    if (!hasChanges.value) return

    isLoading.value = true
    try {
      await adminStore.saveData()

      // Ensure flags are cleared in store after successful save
      if (typeof adminStore.clearAdFlags === 'function') {
        adminStore.clearAdFlags()
      }
    } catch (e) {
      console.error('Failed to save ads:', e)
    } finally {
      isLoading.value = false
    }
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
    right: 13px;
  }
</style>
