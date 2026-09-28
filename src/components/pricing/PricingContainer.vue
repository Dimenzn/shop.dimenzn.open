<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto text-center q-pb-sm">
      <q-avatar size="48px" class="q-mt-sm q-mb-xs">
        <img :src="companyLogo" loading="lazy" alt="Company Logo" style="object-fit: contain" />
      </q-avatar>

      <div class="text-h6 text-weight-bolder text-primary" style="letter-spacing: 0.1em">
        {{ companyName }}
      </div>
      <div class="text-caption text-grey-7 q-px-md q-mb-sm">
        {{
          $t(
            'info.APP_DESCRIPTION',
            'The best place to find amazing products and unbeatable deals.'
          )
        }}
      </div>
      <q-separator />
    </div>

    <q-scroll-area class="col"> </q-scroll-area>
  </div>
</template>
<script setup>
  import { computed } from 'vue'
  import { useUIStore } from 'stores/ui.store'

  const uiStore = useUIStore()

  // App Info
  const companyName = computed(() => uiStore.ui[0]?.companyName || '')
  const companyLogo = computed(() => uiStore.ui[0]?.urlImageCompanyLogo || '')
</script>
