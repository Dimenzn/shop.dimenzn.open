<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: 97dvh; border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_NET_ERROR') || 'Connection Error' }}
    </div>

    <div
      class="col hide-native-scrollbar"
      style="overflow-y: auto; overflow-x: hidden; min-height: 0"
    >
      <div class="q-pb-xl full-width flex flex-center text-center" style="min-height: 100%">
        <div class="q-pa-md" style="max-width: 400px; width: 100%">
          <q-icon name="cloud_off" size="6em" color="negative" class="q-mb-md" />

          <div class="text-h5 text-weight-bold q-mb-sm text-dark">
            {{ $t('label.NET_ERR_OFF') }}
          </div>

          <div class="text-body1 text-grey-7 q-mb-xl">
            {{ $t('label.NET_ERR_LOST') }}
          </div>

          <q-btn
            rounded
            unelevated
            color="primary"
            icon="refresh"
            :label="$t('label.NET_ERR_RECON')"
            :loading="loading"
            @click="retryConnection"
            class="full-width q-py-sm text-weight-bold"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useAuthStore } from 'src/stores/auth.store'

  const authStore = useAuthStore()
  const loading = ref(false)

  const retryConnection = async () => {
    loading.value = true

    try {
      // 1. Force the store to check the backend
      await authStore.checkSystemStatus()

      // 2. Delay for smooth UI
      await new Promise(resolve => setTimeout(resolve, 800))

      if (!authStore.isOffline) {
        // 🚀 THE FIX: Use reload() instead of hard-coding '/'
        // This lets the Router evaluate if we should go to /register or /
        window.location.reload()
      }
    } catch (error) {
      console.error('Reconnection check failed:', error)
    } finally {
      loading.value = false
    }
  }
</script>
