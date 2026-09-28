<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto row items-center q-pa-md bg-primary text-white">
      <q-btn flat round dense icon="arrow_back" color="white" @click="router.back()" />
      <div class="text-h6 q-ml-sm text-weight-bold">{{ pageTitle }}</div>
    </div>

    <q-scroll-area class="col q-pa-md">
      <div class="row justify-center full-width q-pb-xl">
        <div class="col-12 col-xl-10">
          <div
            v-if="pageContent"
            class="text-body1 text-grey-8 legal-content"
            v-html="pageContent"
          ></div>

          <div
            v-else
            class="column items-center justify-center text-center text-grey-6 q-pa-xl"
            style="min-height: 50vh"
          >
            <q-icon name="article" size="4em" class="q-mb-md opacity-50" />
            <div class="text-h6">{{ $t('msgSystem.NO_DATA', 'No data found') }}</div>
          </div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'

  const route = useRoute()
  const router = useRouter()
  const { t } = useI18n()

  // We determine what to show based on the route name!
  const pageTitle = computed(() => {
    if (route.path.includes('shipping')) return t('info.SHIPPING', 'Shipping & Returns')
    if (route.path.includes('faq')) return t('info.FAQ', 'FAQ')
    if (route.path.includes('terms')) return t('info.TERMS', 'Terms of Service')
    if (route.path.includes('privacy')) return t('info.PRIVACY', 'Privacy Policy')
    return t('info.LEGAL', 'Legal Information')
  })

  // Eventually, you might pull this from your database.
  // For now, we map it to translation keys that you can add to your en-US_texts.json
  const pageContent = computed(() => {
    if (route.path.includes('shipping')) return t('legalText.SHIPPING', '')
    if (route.path.includes('faq')) return t('legalText.FAQ', '')
    if (route.path.includes('terms')) return t('legalText.TERMS', '')
    if (route.path.includes('privacy')) return t('legalText.PRIVACY', '')
    return ''
  })
</script>

<style scoped>
  /* Target the raw HTML coming from the translation file */
  .legal-content {
    line-height: 1.6;
  }

  .legal-content :deep(h3) {
    font-size: 1.15rem; /* Scales it down to look like a text-h6 */
    font-weight: 700;
    margin-top: 32px;
    margin-bottom: 12px;
    color: var(--q-primary); /* Gives the headings your brand blue color! */
  }

  .legal-content :deep(p) {
    margin-bottom: 16px;
  }

  .legal-content :deep(ul) {
    margin-bottom: 16px;
    padding-left: 24px;
  }

  .legal-content :deep(li) {
    margin-bottom: 8px;
  }
</style>
