<template>
  <q-layout view="lHh Lpr lFf" class="bg-grey-1">
    <q-page-container>
      <q-page class="flex flex-center">
        <div
          class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
          style="height: 97dvh; width: 100%; border-radius: 16px; overflow: hidden"
        >
          <div
            class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6"
          >
            APP INSTALLER
          </div>

          <div
            class="col hide-native-scrollbar"
            style="overflow-y: auto; overflow-x: hidden; min-height: 0"
          >
            <div class="q-pb-xl full-width flex flex-center text-center" style="min-height: 100%">
              <div class="q-pa-md" style="max-width: 450px; width: 100%">
                <q-icon name="rocket_launch" size="6em" color="primary" class="q-mb-md" />

                <div class="text-h5 text-weight-bold q-mb-sm text-dark">Database Setup</div>

                <div class="text-body1 text-grey-7 q-mb-xl">
                  A valid database connection is required to initialize and configure the
                  application.
                </div>

                <q-input
                  v-model="mongoUriModel"
                  outlined
                  label="MongoDB Connection String"
                  hint="Format: mongodb+srv://..."
                  class="q-mb-xl text-left"
                  :error="!!errorMsg"
                  :error-message="errorMsg"
                >
                  <template v-slot:prepend>
                    <q-icon name="storage" />
                  </template>
                </q-input>

                <q-btn
                  rounded
                  unelevated
                  color="primary"
                  icon="build"
                  label="Connect & Setup"
                  :loading="isSettingUp"
                  @click="handleFullSetup"
                  class="full-width q-py-sm text-weight-bold"
                />

                <div class="text-caption text-grey-5 q-mt-lg">
                  Clicking this button will securely save your credentials, restart the backend
                  server, and seed the initial database.
                </div>
              </div>
            </div>
          </div>
        </div>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import api from 'src/utils/api'
  import { useAdminStore } from 'src/stores/admin.store'

  // --- State ---
  const isSettingUp = ref(false)
  const mongoUriModel = ref('')
  const errorMsg = ref('')

  const adminStore = useAdminStore()

  // --- Helper 1: Just wait for it to be online (Used on Page Refresh) ---
  const waitForServerOnline = async () => {
    console.log('Checking if server is online...')
    for (let i = 0; i < 30; i++) {
      try {
        await api.get('/open/config', { timeout: 2000 })
        console.log('✅ Server is online and ready!')
        return true
      } catch {
        await new Promise(r => setTimeout(r, 1000))
      }
    }
    throw new Error('Server restart timed out.')
  }

  // --- Helper 2: Watch it die, then come back (Used when clicking Install) ---
  const waitForServerRestart = async () => {
    console.log('Phase 1: Waiting for server to go offline...')
    let isDead = false

    // Ping every 500ms until the server refuses the connection
    for (let i = 0; i < 20; i++) {
      try {
        await api.get('/open/config', { timeout: 500 })
        await new Promise(r => setTimeout(r, 500))
      } catch {
        isDead = true
        console.log('✅ Server is officially offline.')
        break
      }
    }

    if (!isDead) throw new Error('Server refused to shut down.')

    console.log('Phase 2: Waiting for server to boot back up...')
    await waitForServerOnline() // Reuse the online checker for Phase 2!
  }

  // --- Logic ---
  const handleFullSetup = async () => {
    if (!mongoUriModel.value) {
      errorMsg.value = 'Connection string is required'
      return
    }

    // 🧹 STEP 1: WIPE OLD DATA
    localStorage.clear()

    isSettingUp.value = true
    errorMsg.value = ''

    try {
      // 1. 🚩 SET FLAGS
      localStorage.setItem('post_setup_redirect', 'true')
      localStorage.setItem('setup_seeding_required', 'true')

      // 2. SEND URI TO BACKEND
      await api.post('/open/install/system', {
        mongoUri: mongoUriModel.value
      })

      // 3. WATCH THE REBOOT
      await waitForServerRestart()

      // 4. SEED DATABASE
      await adminStore.initDatabase()

      // Clear the seeding flag because we just did it
      localStorage.removeItem('setup_seeding_required')

      // 5. HARD RELOAD
      window.location.href = '/'
    } catch (error) {
      console.error(error)

      // 🚀 FIX: Clear the zombie flag so the user can safely try again!
      localStorage.removeItem('setup_seeding_required')

      // If it's a network error during the initial request, the backend is likely completely offline
      if (error.message === 'Network Error') {
        window.location.href = '/network-error'
        return
      }

      errorMsg.value = error.response?.data?.message || 'Connection Failed'
    } finally {
      isSettingUp.value = false
    }
  }

  // ----------------------------------------------------------------
  // 🔄 RESUME SETUP (Catches Dev Server Auto-Reloads)
  // ----------------------------------------------------------------
  onMounted(async () => {
    if (localStorage.getItem('setup_seeding_required') === 'true') {
      console.log('Installer: Resuming interrupted setup...')
      isSettingUp.value = true
      errorMsg.value = 'Resuming installation... Please wait.'

      try {
        // 1. Ensure server is awake (Just checking online status, not waiting for death)
        await waitForServerOnline()

        // 2. Run the seed script we missed!
        await adminStore.initDatabase()

        // 3. Clean up and go to the app
        localStorage.removeItem('setup_seeding_required')
        window.location.href = '/'
      } catch (error) {
        console.error('Resume Setup Failed:', error)
        errorMsg.value =
          'Failed to resume setup. Please check your connection string and try again.'

        // 🚀 FIX: The Death-Loop Killer.
        localStorage.removeItem('setup_seeding_required')
      } finally {
        isSettingUp.value = false
      }
    }
  })
</script>

<style lang="scss" scoped>
  /* Hide scrollbar for Chrome, Safari and Opera */
  .hide-native-scrollbar::-webkit-scrollbar {
    display: none;
  }

  /* Hide scrollbar for IE, Edge and Firefox */
  .hide-native-scrollbar {
    -ms-overflow-style: none; /* IE and Edge */
    scrollbar-width: none; /* Firefox */
  }
</style>
