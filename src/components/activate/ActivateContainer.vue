<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: 97dvh; border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_VERIFICATION') }}
    </div>

    <div
      class="col hide-native-scrollbar"
      style="overflow-y: auto; overflow-x: hidden; min-height: 0"
    >
      <div class="q-pb-xl full-width flex flex-center text-center" style="min-height: 100%">
        <div class="q-pa-md" style="max-width: 400px; width: 100%">
          <div v-if="loading" class="column items-center">
            <q-spinner-dots size="5em" color="primary" class="q-mb-lg" />
            <div class="text-h6 text-grey-8">{{ $t('label.VER_LINK_PROCESS') }}</div>
          </div>

          <div v-else-if="success" class="column items-center">
            <q-icon
              name="check_circle"
              color="positive"
              size="5em"
              class="q-mb-md shadow-transition"
            />
            <div class="text-h5 text-weight-bold q-mb-sm text-dark">
              {{ $t('label.VER_LINK_VERIFY') }}
            </div>

            <div class="text-body2 text-grey-7 q-mb-xl">
              {{ $t('label.VER_LINK_CLOSE') }}<br />
              {{ $t('label.VER_LINK_ORIGINAL') }}
            </div>

            <q-btn
              unelevated
              color="primary"
              class="full-width q-py-sm text-weight-bold rounded-borders"
              :label="$t('button.BTN_CLOSE')"
              @click="closeTab"
            />
          </div>

          <div v-else class="column items-center">
            <q-icon name="error_outline" color="negative" size="5em" class="q-mb-md" />
            <div class="text-h5 text-weight-bold q-mb-sm text-dark">
              {{ $t('label.VER_LINK_FAIL') }}
            </div>

            <div class="text-body2 text-grey-7 q-mb-xl">
              {{ $t(`msgSystem.${errorMessage}`) }}
            </div>

            <q-btn
              rounded
              unelevated
              color="primary"
              to="/login"
              :label="$t('button.BTN_BACK_LOGIN')"
              class="full-width q-py-sm text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  // 1. Vue Imports
  import { ref, onMounted, onUnmounted } from 'vue'
  import { useRoute } from 'vue-router'

  // 2. Store Imports
  import { useAuthStore } from 'src/stores/auth.store'

  const route = useRoute()
  const authStore = useAuthStore()

  // --- State ---
  const loading = ref(true)
  const success = ref(false)
  const errorMessage = ref('')

  // 📡 1. Create the Broadcast Channel
  const channel = new BroadcastChannel('auth_channel')

  // --- Lifecycle ---
  onMounted(async () => {
    const token = route.query.token

    if (!token) {
      loading.value = false
      errorMessage.value = 'VER_LINK_INVALID'
      return
    }

    try {
      await authStore.verifyAccount(token)
      success.value = true

      // 📡 2. Send the Signal to the Original Tab
      channel.postMessage({ type: 'VERIFICATION_SUCCESS' })
    } catch (error) {
      // 🛡️ Safe fallback to prevent "$t(msgSystem.undefined)" crashes
      errorMessage.value = error.response?.data?.message || 'NETWORK_ERROR'
    } finally {
      loading.value = false
    }
  })

  // 🧹 3. Clean up the channel to prevent memory leaks!
  onUnmounted(() => {
    channel.close()
  })

  // --- Actions ---
  const closeTab = () => {
    // Note: Most modern browsers only allow scripts to close tabs that the script opened.
    // If it fails, the user will just manually close the tab as instructed by the UI.
    window.close()
  }
</script>
