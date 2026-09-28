<template>
  <q-page>
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-xl-10">
        <OrderContainer />
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
  import OrderContainer from 'src/components/orders/OrderContainer.vue'

  const route = useRoute()
  const { locale } = useI18n()
  const laStore = useLAStore()

  onMounted(() => {
    // Catch the language parameter from the email link
    const urlLang = route.query.lang

    if (urlLang) {
      // A. Update the UI translation
      locale.value = urlLang

      // B. Save to LocalStorage
      localStorage.setItem('user-locale', urlLang)

      // C. Keep Pinia fully synchronized
      laStore.currentLanguage = urlLang
    }
  })
</script>
