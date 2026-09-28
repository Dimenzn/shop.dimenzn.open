<template>
  <q-page class="row items-center justify-center">
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-xl-10">
        <ResetPassContainer />
      </div>
    </div>
  </q-page>
</template>

<script setup>
  // 1. Vue & Library Imports
  import { onMounted } from 'vue'
  import { useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n'

  // 2. Store Imports
  import { useLAStore } from 'src/stores/languages.store'

  // 3. Component Imports
  import ResetPassContainer from 'src/components/reset/ResetPassContainer.vue'

  const route = useRoute()
  const { locale } = useI18n()
  const laStore = useLAStore()

  onMounted(() => {
    // Grab the language injected into the email link by the backend
    const urlLang = route.query.lang

    if (urlLang) {
      // A. Instantly translate the UI
      locale.value = urlLang

      // B. Save it to local storage so it persists after password reset
      localStorage.setItem('user-locale', urlLang)

      // C. Keep your Pinia state fully synchronized
      laStore.currentLanguage = urlLang
    }
  })
</script>
