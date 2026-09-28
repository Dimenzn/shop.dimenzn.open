<template>
  <q-page class="row items-center justify-center">
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-xl-10">
        <ActivateContainer />
      </div>
    </div>
  </q-page>
</template>

<script setup>
  // 1. Grouped all Vue/Library imports at the top
  import { onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'

  // 2. Imported your actual data store
  import { useLAStore } from 'src/stores/languages.store'

  // 3. Component imports at the bottom of the import block
  import ActivateContainer from 'src/components/activate/ActivateContainer.vue'

  const route = useRoute()
  const { locale } = useI18n()
  const laStore = useLAStore()

  onMounted(() => {
    // Grab the language from the email URL
    const urlLang = route.query.lang

    if (urlLang) {
      // A. Update the active Vue i18n language
      locale.value = urlLang

      // B. Persist it so it survives a refresh
      localStorage.setItem('user-locale', urlLang)

      // C. Keep Pinia in sync!
      // (If your store uses a different variable name than `currentLanguage`, update it here)
      laStore.currentLanguage = urlLang
    }
  })
</script>
