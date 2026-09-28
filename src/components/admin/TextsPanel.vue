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
        <div class="full-width text-center">{{ $t('admin.NAV_TEXTS') }}</div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
          <div class="col-xs-12 col-sm-auto">
            <q-btn
              size="sm"
              color="negative"
              unelevated
              outline
              icon="restart_alt"
              :label="$t('admin.BTN_RESET_TXT')"
              @click="confirmRestore"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
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
            :label="$t('admin.LANG_SEARCH')"
            clearable
            class="full-width"
          >
            <template v-slot:append>
              <q-icon name="search" color="primary" />
            </template>
          </q-input>
        </div>
      </div>

      <div class="col-12 col-md-auto row items-center justify-end q-gutter-x-sm no-wrap">
        <input
          type="file"
          ref="fileInput"
          accept=".json"
          style="display: none"
          @change="onFileImport"
        />
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md" :content-style="{ width: '100%' }">
        <div class="q-mb-lg" v-if="hasMatches(titleTexts)">
          <div class="text-overline text-primary q-mb-xs">{{ $t('admin.HEADER_TITLES') }}</div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in titleTexts" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="titleTexts[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(labelTexts)">
          <div class="text-overline text-primary q-mb-xs">{{ $t('admin.HEADER_LABELS') }}</div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in labelTexts" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="labelTexts[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(buttonTexts)">
          <div class="text-overline text-primary q-mb-xs">{{ $t('admin.HEADER_BUTTONS') }}</div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in buttonTexts" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="buttonTexts[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(msgTexts)">
          <div class="text-overline text-primary q-mb-xs">{{ $t('admin.HEADER_MSGS') }}</div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in msgTexts" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="msgTexts[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(adminTexts)">
          <div class="text-overline text-primary q-mb-xs">{{ $t('admin.HEADER_ADMIN') }}</div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in adminTexts" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="adminTexts[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(seller)">
          <div class="text-overline text-primary q-mb-xs">{{ $t('admin.HEADER_SELLER') }}</div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in seller" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="seller[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(emailWelcome)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_EMAIL_WELCOME') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in emailWelcome" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="emailWelcome[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(emailReset)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_EMAIL_RESET') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in emailReset" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="emailReset[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(emailOrder)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_EMAIL_ORDER') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in emailOrder" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="emailOrder[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(eDigitalOrder)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_EMAIL_DIGITAL_ORDER', 'DIGITAL ORDER EMAIL') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in eDigitalOrder" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input
                  outlined
                  v-model="eDigitalOrder[key]"
                  :label="key"
                  dense
                  bg-color="white"
                />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg" v-if="hasMatches(eSellerOrder)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_EMAIL_SELLER_ORDER') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in eSellerOrder" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="eSellerOrder[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg q-pb-xl" v-if="hasMatches(emailAdminOrder)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_EMAIL_ADMIN_ORDER') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in emailAdminOrder" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input
                  outlined
                  v-model="emailAdminOrder[key]"
                  :label="key"
                  dense
                  bg-color="white"
                />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg q-pb-xl" v-if="hasMatches(InfoSection)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_INFO_PAGE') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in InfoSection" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="InfoSection[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
        </div>

        <div class="q-mb-lg q-pb-xl" v-if="hasMatches(legalText)">
          <div class="text-overline text-primary q-mb-xs">
            {{ $t('admin.HEADER_LEGAL_PAGE') }}
          </div>
          <q-separator class="q-mb-sm" />
          <div class="row q-col-gutter-sm">
            <template v-for="(value, key) in legalText" :key="key">
              <div class="col-12 col-md-6 col-lg-4" v-if="matchesFilter(key, value)">
                <q-input outlined v-model="legalText[key]" :label="key" dense bg-color="white" />
              </div>
            </template>
          </div>
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
  import { ref, computed, watch, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { useQuasar } from 'quasar'

  // Stores & Data
  import { useAdminStore } from 'src/stores/admin.store'
  import sampleLanguagesRaw from '../../../sampleDB/languages.json?raw'

  // --- Setup ---
  const { locale, t } = useI18n({ useScope: 'global' })
  const adminStore = useAdminStore()
  const $q = useQuasar()

  // --- State ---
  const fileInput = ref(null)
  const isLoading = ref(false)
  const filter = ref('')

  const fetchData = async () => {
    isLoading.value = true
    try {
      await adminStore.fetchData()
    } catch (error) {
      console.error('Error fetching admin data:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Lifecycle ---
  onMounted(async () => {
    fetchData()
  })

  // --- Computed Mapping (Fuzzy Logic) ---

  /**
   * Attempts to locate the currently selected language dictionary.
   * Uses fuzzy matching (e.g. matching "en" to "en-US") to prevent data drops.
   */
  const currentLangObject = computed(() => {
    const langs = adminStore.adminData?.languages
    if (!langs) return null

    let found = langs.find(x => x.value === locale.value)
    if (!found) found = langs.find(x => x.value.startsWith(locale.value))
    if (!found) found = langs.find(x => locale.value.startsWith(x.value))

    return found
  })

  // Safely map dictionary sub-objects, defaulting to empty objects to prevent template crashes
  const titleTexts = computed(() => currentLangObject.value?.i18n?.title || {})
  const labelTexts = computed(() => currentLangObject.value?.i18n?.label || {})
  const buttonTexts = computed(() => currentLangObject.value?.i18n?.button || {})
  const msgTexts = computed(() => currentLangObject.value?.i18n?.msgSystem || {})
  const adminTexts = computed(() => currentLangObject.value?.i18n?.admin || {})
  const seller = computed(() => currentLangObject.value?.i18n?.seller || {})
  const emailWelcome = computed(() => currentLangObject.value?.i18n?.eWelcome || {})
  const emailReset = computed(() => currentLangObject.value?.i18n?.eResetPass || {})
  const emailOrder = computed(() => currentLangObject.value?.i18n?.eOrder || {})
  const eDigitalOrder = computed(() => currentLangObject.value?.i18n?.eDigitalOrder || {})
  const eSellerOrder = computed(() => currentLangObject.value?.i18n?.eSellerOrder || {})
  const emailAdminOrder = computed(() => currentLangObject.value?.i18n?.eAdminOrder || {})
  const InfoSection = computed(() => currentLangObject.value?.i18n?.info || {})
  const legalText = computed(() => currentLangObject.value?.i18n?.legalText || {})

  // --- Button State ---
  const hasChanges = computed(() => adminStore.modifiedTexts)

  // --- Watchers ---

  /**
   * Detects typing modifications.
   * If the object reference remains the same but contents change, the admin typed something.
   */
  watch(
    currentLangObject,
    (newVal, oldVal) => {
      if (newVal && oldVal && newVal === oldVal && !isLoading.value) {
        if (typeof adminStore.markTextsAsModified === 'function') {
          adminStore.markTextsAsModified()
        }
      }
    },
    { deep: true }
  )

  // --- Filters ---

  /**
   * Evaluates if a specific key/value pair matches the current search term.
   */
  const matchesFilter = (key, value) => {
    if (!filter.value) return true

    const searchTerm = filter.value.toLowerCase()
    const matchesKey = key.toLowerCase().includes(searchTerm)
    const matchesValue = value && String(value).toLowerCase().includes(searchTerm)

    return matchesKey || matchesValue
  }

  /**
   * Checks if an entire dictionary block (e.g. 'Titles') contains ANY matching terms.
   * Used to hide empty sections during search.
   */
  const hasMatches = obj => {
    if (!obj || Object.keys(obj).length === 0) return false
    if (!filter.value) return true

    return Object.entries(obj).some(([key, value]) => matchesFilter(key, value))
  }

  // --- API & Persistence Actions ---

  const saveLocal = async () => {
    if (!hasChanges.value) return

    isLoading.value = true
    try {
      await adminStore.saveData()

      if (typeof adminStore.clearTextFlags === 'function') {
        adminStore.clearTextFlags()
      }
    } catch (error) {
      console.error('Failed to save texts:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Import / Export / Restore Logic ---

  const confirmRestore = () => {
    $q.dialog({
      title: t('button.BTN_CONFIRM'),
      message: t('admin.MSG_RESET_CONFIRM'),
      cancel: true,
      persistent: true,
      ok: { label: t('button.BTN_RESET'), color: 'negative' }
    }).onOk(() => {
      restoreDefaults()
    })
  }

  /**
   * Resets the currently selected language back to the system's factory default JSON.
   */
  const restoreDefaults = () => {
    try {
      const sampleLanguages = JSON.parse(sampleLanguagesRaw)
      const enUS_Source = sampleLanguages.find(lang => lang.value === 'en-US')

      if (!enUS_Source || !currentLangObject.value) return

      // Deep copy the default translations to prevent memory reference bugs
      currentLangObject.value.i18n = JSON.parse(JSON.stringify(enUS_Source.i18n))

      if (typeof adminStore.markTextsAsModified === 'function') {
        adminStore.markTextsAsModified()
      }
    } catch (e) {
      console.error('Factory Reset Failed:', e)
    }
  }

  /**
   * Downloads the current language's dictionary as a JSON file.
   */
  const exportJSON = () => {
    if (!currentLangObject.value?.i18n) return

    const dataToExport = currentLangObject.value.i18n
    const jsonString = JSON.stringify(dataToExport, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${locale.value}_texts.json`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const triggerImport = () => {
    if (fileInput.value) fileInput.value.click()
  }

  /**
   * Validates and imports a JSON dictionary uploaded by the user.
   */
  const onFileImport = event => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = e => {
      try {
        const json = JSON.parse(e.target.result)
        const requiredKeys = ['title', 'label', 'button', 'msgSystem', 'admin']

        // Strict Validation: Ensure uploaded JSON contains all necessary translation blocks
        const hasKeys = requiredKeys.every(key => key in json)
        if (!hasKeys) throw new Error('Invalid JSON structure. Missing core dictionaries.')

        if (currentLangObject.value) {
          currentLangObject.value.i18n = json

          if (typeof adminStore.markTextsAsModified === 'function') {
            adminStore.markTextsAsModified()
          }
        }
      } catch (error) {
        console.error('Import Failed:', error)
      } finally {
        event.target.value = '' // Reset input so same file can be uploaded again if needed
      }
    }
    reader.readAsText(file)
  }
</script>
