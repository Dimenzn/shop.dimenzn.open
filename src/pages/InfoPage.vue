<template>
  <div>
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-xl-10">
        <InfoContainer />
      </div>
    </div>
  </div>
</template>

<script setup>
  import InfoContainer from 'src/components/info/InfoContainer.vue'
  import { watch } from 'vue'
  import { useRouter } from 'vue-router'
  import { useUIStore } from 'stores/ui.store'

  const router = useRouter()
  const uiStore = useUIStore()

  // 🛑 ROUTE BOUNCER: Kick user to home if the Info section is disabled
  watch(
    () => uiStore.ui[0]?.showInfoPage,
    isShowing => {
      if (isShowing === false) {
        router.replace('/')
      }
    },
    { immediate: true }
  )
</script>
