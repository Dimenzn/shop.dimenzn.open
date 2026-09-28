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
        <div class="full-width text-center">{{ $t('admin.NAV_LANGS') }}</div>
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

    <div class="row q-mb-md q-pr-md items-center justify-between">
      <div class="col-12 col-md-auto q-mb-sm q-mb-md-none">
        <div style="min-width: 250px" class="full-width">
          <q-input
            dense
            outlined
            bg-color="white"
            v-model="filter"
            :label="$t('admin.LANG_SEARCH_HINT')"
            clearable
            class="full-width"
          >
            <template v-slot:append>
              <q-icon name="search" color="primary" />
            </template>
          </q-input>
        </div>
      </div>

      <div class="col-12 col-md-auto row items-center justify-end">
        <div class="text-caption text-grey-8 text-weight-medium">
          <span class="text-primary">{{ activeCount }}</span> {{ $t('admin.LBL_ACTIVE') }} /
          <span>{{ filteredLangs.length }}</span> {{ $t('admin.LBL_TOTAL') }}
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md" :content-style="{ width: '100%' }">
        <div v-if="filteredLangs.length > 0" class="row q-col-gutter-md q-pb-xl">
          <div
            class="col-12 col-sm-6 col-md-4 col-xl-3"
            v-for="lang in filteredLangs"
            :key="lang.value"
          >
            <q-card
              flat
              bordered
              :class="lang.selected ? 'bg-blue-1 border-primary shadow-1' : 'bg-white text-grey-6'"
              style="transition: all 0.3s ease"
            >
              <q-item>
                <q-item-section avatar>
                  <q-avatar rounded size="40px" class="shadow-1 bg-white">
                    <img
                      v-if="lang.flagImage"
                      :src="lang.flagImage"
                      alt="flag"
                      style="object-fit: cover"
                    />
                    <q-icon v-else name="flag" color="grey-5" />
                  </q-avatar>
                </q-item-section>

                <q-item-section>
                  <q-item-label
                    class="text-weight-bold"
                    :class="lang.selected ? 'text-primary' : 'text-blue-grey'"
                  >
                    {{ lang.label }}
                  </q-item-label>
                  <q-item-label caption :class="lang.selected ? 'text-primary' : ''">
                    {{ lang.value }}
                  </q-item-label>
                </q-item-section>

                <q-item-section side>
                  <q-toggle
                    v-model="lang.selected"
                    color="primary"
                    @update:model-value="val => handleToggle(val, lang.value)"
                  >
                    <q-tooltip>
                      {{
                        lang.selected
                          ? $t('admin.LANG_SELECTED', 'Selected')
                          : $t('admin.LANG_DISABLED', 'Disabled')
                      }}
                    </q-tooltip>
                  </q-toggle>
                </q-item-section>
              </q-item>
            </q-card>
          </div>
        </div>

        <div
          v-else
          class="column items-center justify-center text-grey-6 q-pa-xl"
          style="min-height: 40vh"
        >
          <q-icon name="translate" size="4em" class="q-mb-md text-grey-4" />
          <div class="text-h6">{{ $t('msgSystem.NO_DATA_LANG') }}</div>
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

  // Stores
  import { useAdminStore } from 'src/stores/admin.store'

  // --- Setup ---
  const adminStore = useAdminStore()

  // --- State ---
  const isLoading = ref(false)
  const filter = ref('')

  // --- Computed ---

  // Safely fallback to an empty array
  const langs = computed(() => adminStore.adminData?.languages || [])

  /**
   * Filters the language list based on the search input (checks both label and locale code).
   */
  const filteredLangs = computed(() => {
    if (!filter.value) return langs.value
    const needle = filter.value.toLowerCase()
    return langs.value.filter(
      l => l.label.toLowerCase().includes(needle) || l.value.toLowerCase().includes(needle)
    )
  })

  /**
   * Calculates the total number of actively selected languages.
   */
  const activeCount = computed(() => langs.value.filter(l => l.selected).length)

  /**
   * Evaluates if there are unsaved modifications in the local store.
   */
  const hasChanges = computed(() => {
    return adminStore.modifiedLanguages && adminStore.modifiedLanguages.size > 0
  })

  const fetchData = async () => {
    //if (adsList.value.length === 0) {
    isLoading.value = true
    try {
      await adminStore.fetchData()
    } catch (error) {
      console.error('Failed to load languages:', error)
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
   * Handles toggling a language on or off, preparing data structures if needed.
   */
  const handleToggle = (isActive, langValue) => {
    // 1. Mark as dirty so the Save button enables
    if (typeof adminStore.markLanguageAsModified === 'function') {
      adminStore.markLanguageAsModified()
    }

    // 2. If enabling, ensure data structures exist (copy from default if needed)
    if (isActive && typeof adminStore.setupLang === 'function') {
      adminStore.setupLang(langValue)
    }
  }

  /**
   * Sends all staged changes to the backend.
   */
  const saveLocal = async () => {
    if (!hasChanges.value) return

    isLoading.value = true
    try {
      await adminStore.saveData()

      // Clear flags after successful save
      if (typeof adminStore.clearLanguageFlags === 'function') {
        adminStore.clearLanguageFlags()
      }
    } catch (error) {
      console.error('Failed to save languages:', error)
    } finally {
      isLoading.value = false
    }
  }
</script>

<style lang="scss" scoped>
  /* Highlight active cards */
  .border-primary {
    border: 1px solid $primary;
    border-left: 5px solid $primary;
    transition: all 0.3s ease;
  }
</style>
