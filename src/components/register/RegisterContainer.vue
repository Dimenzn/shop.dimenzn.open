<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_REGISTER') }}
    </div>

    <div
      class="col hide-native-scrollbar"
      style="overflow-y: auto; overflow-x: hidden; min-height: 0"
    >
      <div class="q-pb-xl full-width flex flex-center" style="min-height: 100%">
        <q-form
          @submit="handleRegister"
          @reset="handleReset"
          class="full-width q-px-md"
          style="max-width: 400px"
        >
          <div class="row justify-end q-mb-md">
            <q-btn
              flat
              dense
              size="sm"
              color="grey-6"
              type="reset"
              icon="clear_all"
              :label="$t('button.BTN_RESET')"
            />
          </div>

          <q-input
            outlined
            v-model="email"
            :label="$t('label.FIELD_EMAIL')"
            type="email"
            class="q-mb-md"
            :rules="[val => !!val || $t('label.VAL_EMAIL_REQ')]"
          />

          <q-input
            outlined
            v-model="password"
            :label="$t('label.FIELD_PASSWORD')"
            type="password"
            class="q-mb-md"
            :rules="[val => !!val || $t('label.VAL_PASS_REQ')]"
          />

          <q-input
            outlined
            v-model="passwordConfirm"
            :label="$t('label.FIELD_CONFIRM_PASS')"
            type="password"
            class="q-mb-xl"
            :rules="[
              val => !!val || $t('label.VAL_CONFIRM_PASS_REQ'),
              val => val === password || $t('label.VAL_PASS_MISMATCH')
            ]"
          />

          <div class="column q-gutter-y-sm">
            <q-btn
              unelevated
              rounded
              color="primary"
              type="submit"
              class="full-width q-py-sm text-weight-bold"
            >
              {{ $t('button.BTN_CREATE') }}
            </q-btn>

            <q-btn flat rounded color="primary" class="full-width" no-caps to="/login">
              {{ $t('title.PAGE_LOGIN') }}
            </q-btn>
          </div>
        </q-form>
      </div>
    </div>

    <q-dialog
      v-model="showWelcomeDialog"
      persistent
      transition-show="jump-down"
      transition-hide="jump-up"
    >
      <q-card
        class="text-center q-pa-lg"
        style="border-radius: 16px"
        :style="[{ width: '400px', maxWidth: '90vw' }, offsetStyle]"
      >
        <div class="q-mb-md">
          <q-avatar
            size="80px"
            color="primary"
            text-color="white"
            icon="mark_email_unread"
            class="shadow-3"
          />
        </div>

        <div class="text-h5 text-weight-bold q-mb-xs">
          {{ $t('title.DIALOG_CHECK_INBOX') }}
        </div>

        <div class="text-grey-7 q-mb-lg">
          {{ $t('label.WAITING_VERIFICATION') }}
        </div>

        <q-banner class="bg-blue-1 rounded-borders q-mb-lg text-left text-body2">
          <template v-slot:avatar>
            <q-icon name="info" color="primary" />
          </template>
          {{ $t('label.VERIFY_SENT_1') }} <b>{{ email }}</b
          >{{ $t('label.VERIFY_SENT_2') }}
        </q-banner>

        <q-btn
          unelevated
          rounded
          loading
          disable
          color="primary"
          class="full-width q-py-sm text-weight-bold"
        >
          <template v-slot:loading>
            <q-spinner-dots class="on-left" />
            {{ $t('label.WAITING_CONFIRM') }}
          </template>
        </q-btn>

        <div class="q-mt-xl row justify-between items-center text-caption text-grey-8">
          <span
            class="text-weight-medium q-pa-sm rounded-borders"
            :class="{
              'cursor-pointer text-primary bg-blue-1': resendCooldown === 0 && !isResending,
              'text-grey-5 cursor-not-allowed': resendCooldown > 0 || isResending
            }"
            @click="handleResend"
            style="transition: all 0.3s ease"
          >
            {{ isResending ? $t('button.BTN_SENDING') : $t('button.BTN_RESEND_EMAIL') }}
            <span v-if="resendCooldown > 0">({{ resendCooldown }}s)</span>
          </span>

          <span class="cursor-pointer text-weight-medium q-pa-sm" @click="onWelcomeDismiss">
            {{ $t('button.BTN_LOGIN_MANUAL') }}
          </span>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>
<script setup>
  import { ref, onUnmounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useAdminStore } from 'src/stores/admin.store'
  import { useUIStore } from 'stores/ui.store'
  import { useDialogOffset } from 'src/composables/useDialogOffset'

  import { useI18n } from 'vue-i18n'
  const { locale } = useI18n({ useScope: 'global' })

  const router = useRouter()
  const authStore = useAuthStore()
  const adminStore = useAdminStore()
  const uiStore = useUIStore()
  const { offsetStyle } = useDialogOffset(computed(() => uiStore.ui[0]?.leftDrawerOpen || false))

  // Form State
  const email = ref('')
  const password = ref('')
  const passwordConfirm = ref('')

  // Dialog State
  const showWelcomeDialog = ref(false)
  const isPollingTimedOut = ref(false) // 👈 New flag for UI feedback
  const isResending = ref(false) // 👈 Track loading state
  const resendCooldown = ref(0) // 👈 Countdown timer in seconds

  let cooldownInterval = null

  // 📡 1. CHANNEL (Same Browser - Instant)
  const channel = new BroadcastChannel('auth_channel')

  // ⏳ 2. POLLING (Cross Device - Reliable)
  let pollingInterval = null
  let pollingStartTime = 0
  const POLLING_DURATION = 5 * 60 * 1000 // 5 Minutes

  const handleReset = () => {
    email.value = ''
    password.value = ''
    passwordConfirm.value = ''
  }

  const handleRegister = async () => {
    try {
      const result = await authStore.register({
        email: email.value,
        password: password.value,
        locale: locale.value
      })

      if (result.success) {
        // Admin Setup Redirect (Special Case)
        if (result.redirectTo && result.targetPanel) {
          adminStore.activePanel = result.targetPanel
          router.push(result.redirectTo)
          return
        }

        // Show Dialog
        showWelcomeDialog.value = true
        isPollingTimedOut.value = false

        // 🚀 START POLLING IMMEDIATELY
        startPolling()
      }
    } catch (error) {
      console.error('Registration failed:', error)
    }
  }

  const handleResend = async () => {
    // Prevent clicking if already loading or if cooldown is active
    if (isResending.value || resendCooldown.value > 0) return

    isResending.value = true
    try {
      await authStore.resendVerification({
        email: email.value,
        locale: locale.value
      })

      // 👇 Start the 60-second cooldown (No local notify needed)
      resendCooldown.value = 60
      cooldownInterval = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
          clearInterval(cooldownInterval)
        }
      }, 1000)
    } catch (error) {
      console.error('Failed to resend email:', error)
      // The Axios interceptor will automatically show the error notification here!
    } finally {
      isResending.value = false
    }
  }

  // --- LOGIC: ATTEMPT LOGIN SILENTLY ---
  const attemptLogin = async () => {
    try {
      // We try to log in using the credentials currently in the form
      await authStore.login(
        {
          email: email.value,
          password: password.value
        },
        true
      )

      // ✅ SUCCESS! (User verified on phone)
      stopPolling()
      showWelcomeDialog.value = false

      console.log('✅ Verified! Redirecting...')

      // Redirect
      if (authStore.isAdmin) {
        router.push('/admin')
      } else {
        router.push('/')
      }
    } catch {
      // ❌ FAILED (Still unverified)
      // We ignore 401/403 errors here because we expect them while waiting.
      // We just keep polling.
      console.log('Polling: Waiting for verification...')
    }
  }

  const startPolling = () => {
    pollingStartTime = Date.now()

    // Check every 4 seconds
    pollingInterval = setInterval(() => {
      // 🛑 1. CHECK TIMEOUT
      if (Date.now() - pollingStartTime > POLLING_DURATION) {
        console.log('🛑 Polling timed out.')
        stopPolling()
        isPollingTimedOut.value = true // Update UI to let user know
        return
      }

      // 🔄 2. ATTEMPT LOGIN
      attemptLogin()
    }, 4000)
  }

  const stopPolling = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval)
      pollingInterval = null
    }
  }

  // 📡 LISTENER: SAME BROWSER CLICK
  channel.onmessage = event => {
    if (event.data.type === 'VERIFICATION_SUCCESS') {
      console.log('📡 Signal received: Verified in this browser!')
      stopPolling() // Stop the timer, we don't need it anymore
      attemptLogin() // Log them in immediately
    }
  }

  // CLEANUP
  onUnmounted(() => {
    stopPolling()
    channel.close()
    if (cooldownInterval) clearInterval(cooldownInterval)
  })

  // MANUAL CLOSE (If they click "Go to Login manually")
  const onWelcomeDismiss = () => {
    stopPolling()
    showWelcomeDialog.value = false
    router.push('/login')
  }
</script>

<style lang="scss" scoped>
  .registerContainer {
    border: 1px solid $primary;
  }
</style>
