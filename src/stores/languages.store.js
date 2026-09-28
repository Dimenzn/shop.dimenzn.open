import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18nInstance } from 'boot/i18n'
import api from 'src/utils/api'

export const useLAStore = defineStore('la', () => {
  // --- STATE ---
  const langs = ref([])
  let activeFetchPromise = null

  // --- ACTIONS ---

  const initLocale = () => {
    if (!i18nInstance) {
      console.error('[i18n] Instance not available for locale initialization.')
      return
    }

    const persistedLocale = localStorage.getItem('user-locale')
    let localeToSet = persistedLocale

    // 1. Check if the requested locale is still valid and enabled by the Admin
    const isValid = localeToSet && langs.value?.some(l => l.value === localeToSet && l.selected)

    // 2. If invalid (or first time visiting), find the safest fallback
    if (!isValid) {
      const fallback = langs.value?.find(l => l.active) || langs.value?.find(l => l.selected)
      localeToSet = fallback ? fallback.value : 'en-US' // Absolute ultimate fallback
    }

    // 3. Apply the Locale
    if (localeToSet && i18nInstance.global.locale.value !== localeToSet) {
      i18nInstance.global.locale.value = localeToSet
      localStorage.setItem('user-locale', localeToSet)
    }
  }

  // 🚀 FIX: Added `forceReload` parameter to bypass cache when Admin saves new translations
  const fetchLanguages = async (forceReload = false) => {
    // 1. Cache Check
    if (!forceReload && langs.value && langs.value.length > 0) {
      return { data: langs.value }
    }

    // 2. Deduplication Check
    if (activeFetchPromise) {
      return activeFetchPromise
    }

    // 3. Fetch and Lock
    activeFetchPromise = (async () => {
      try {
        const response = await api.post('/open/languages')

        if (Array.isArray(response.data)) {
          langs.value = response.data

          // Re-evaluate the active language now that we have fresh data
          initLocale()

          if (!i18nInstance) return response

          // Merge the live dictionaries into vue-i18n
          langs.value.forEach(langData => {
            const localeCode = langData.value
            const messagesToMerge = langData.i18n

            if (localeCode && messagesToMerge && typeof messagesToMerge === 'object') {
              try {
                i18nInstance.global.mergeLocaleMessage(localeCode, messagesToMerge)
              } catch (e) {
                console.error(`Error merging messages for locale ${localeCode}:`, e)
              }
            }
          })

          return response
        } else {
          console.error('API response for languages is not an array:', response.data)
          langs.value = []
          return response
        }
      } catch (error) {
        console.error('Failed to load languages from API:', error)
        langs.value = []
        throw error
      } finally {
        activeFetchPromise = null
      }
    })()

    return activeFetchPromise
  }

  return {
    // State
    langs,

    // Actions
    fetchLanguages,
    initLocale
  }
})
