<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_LOGIN') }}
    </div>

    <div
      class="col hide-native-scrollbar"
      style="overflow-y: auto; overflow-x: hidden; min-height: 0"
    >
      <div class="q-pb-xl full-width flex flex-center" style="min-height: 100%">
        <q-form
          @submit="handleLogin"
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
            class="q-mb-sm"
            :rules="[val => !!val || $t('label.VAL_PASS_REQ')]"
          />

          <div class="row justify-between items-center q-pt-xs q-mb-lg">
            <q-btn
              flat
              color="secondary"
              no-caps
              icon="mark_email_unread"
              class="text-weight-medium rounded-borders"
              padding="sm md"
              @click="handleResend"
              :disable="!email || resendCooldown > 0 || isResending"
            >
              <span class="q-ml-xs">
                {{ isResending ? $t('label.WAITING_CONFIRM') : $t('button.BTN_RESEND_EMAIL') }}
                <span v-if="resendCooldown > 0">({{ resendCooldown }}s)</span>
              </span>
            </q-btn>

            <q-btn
              flat
              color="primary"
              no-caps
              icon="lock_reset"
              class="text-weight-medium rounded-borders"
              padding="sm md"
              @click="openForgotDialog"
            >
              <span class="q-ml-xs">{{ $t('label.PASS_FORGOT') }}</span>
            </q-btn>
          </div>

          <div class="column q-gutter-y-sm">
            <q-btn
              rounded
              unelevated
              color="primary"
              type="submit"
              class="full-width q-py-sm text-weight-bold"
            >
              {{ $t('button.BTN_LOGIN') }}
            </q-btn>

            <q-btn rounded flat color="primary" class="full-width" no-caps to="/register">
              {{ $t('title.PAGE_REGISTER') }}
            </q-btn>
          </div>
        </q-form>
      </div>
    </div>

    <q-dialog v-model="showForgotDialog" transition-show="scale" transition-hide="scale">
      <q-card style="width: 400px; max-width: 90vw; border-radius: 16px" class="q-pa-sm">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6 text-primary text-weight-bold">
            {{ $t('title.DIALOG_FORGOT_PASS') }}
          </div>
          <q-space />
          <q-btn icon="close" flat round dense color="grey-7" class="bg-grey-2" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md text-grey-8 text-body2">
          {{ $t('label.FORGOT_PASS_INST') }}
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input
            outlined
            v-model="forgotEmail"
            :label="$t('label.FIELD_EMAIL')"
            type="email"
            autofocus
            @keyup.enter="handleForgotPassword"
          >
            <template v-slot:prepend>
              <q-icon name="mail_outline" color="primary" />
            </template>
          </q-input>
        </q-card-section>

        <q-card-actions class="q-px-md q-pb-md q-pt-none">
          <q-btn
            unelevated
            rounded
            color="primary"
            class="full-width q-py-sm text-weight-bold"
            no-caps
            :label="$t('button.BTN_SEND_LINK')"
            @click="handleForgotPassword"
            :loading="isSendingReset"
            :disable="!forgotEmail"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
  import { ref, onUnmounted } from 'vue'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useRouter, useRoute } from 'vue-router'
  import { useI18n } from 'vue-i18n' // 👈 1. Import i18n

  const route = useRoute()
  const authStore = useAuthStore()
  const router = useRouter()
  const { locale } = useI18n() // 👈 2. Get active language

  const email = ref('')
  const password = ref('')

  // Cooldown State for Resend
  const isResending = ref(false)
  const resendCooldown = ref(0)
  let cooldownInterval = null
  // --- Forgot Password State ---
  const showForgotDialog = ref(false)
  const forgotEmail = ref('')
  const isSendingReset = ref(false)

  const openForgotDialog = () => {
    // Auto-fill the email if they already typed it in the login form!
    forgotEmail.value = email.value
    showForgotDialog.value = true
  }

  const handleForgotPassword = async () => {
    if (!forgotEmail.value) return

    isSendingReset.value = true
    try {
      await authStore.forgotPassword({
        email: forgotEmail.value,
        locale: locale.value
      })

      // Close dialog on success (Global Interceptor handles the success message!)
      showForgotDialog.value = false
      forgotEmail.value = ''
    } catch (error) {
      console.error('Forgot password failed:', error)
      // Global Interceptor handles the error message
    } finally {
      isSendingReset.value = false
    }
  }

  const handleLogin = async () => {
    try {
      // 1. Attempt Login
      await authStore.login({
        email: email.value,
        password: password.value
      })

      // 2. Get the Intended Destination
      const intendedPath = route.query.redirect || '/'

      // 3. 🔍 RESOLVE & CHECK PERMISSIONS
      const intendedRoute = router.resolve(intendedPath)

      // 4. Decision Logic
      const requiresAdmin = intendedRoute.meta.requiresAdmin
      const userIsAdmin = authStore.isAdmin

      if (requiresAdmin && !userIsAdmin) {
        console.warn('Redirect denied. User is not Admin. Going Home.')
        router.push('/')
      } else {
        router.push(intendedPath)
      }
    } catch (error) {
      console.error('Login failed:', error)
      // The global interceptor handles "AUTH_INVALID_CREDS" or "LOG_DENIDE"
    }
  }

  const handleResend = async () => {
    // Failsafe: Prevent clicking if no email, already loading, or cooldown is active
    if (!email.value || isResending.value || resendCooldown.value > 0) return

    isResending.value = true
    try {
      await authStore.resendVerification({
        email: email.value,
        locale: locale.value
      })

      // Start the 60-second cooldown
      resendCooldown.value = 60
      cooldownInterval = setInterval(() => {
        resendCooldown.value--
        if (resendCooldown.value <= 0) {
          clearInterval(cooldownInterval)
        }
      }, 1000)
    } catch (error) {
      console.error('Failed to resend email:', error)
      // The global interceptor handles the error notification!
    } finally {
      isResending.value = false
    }
  }

  const handleReset = () => {
    email.value = ''
    password.value = ''
  }

  // Cleanup the timer if they navigate away
  onUnmounted(() => {
    if (cooldownInterval) clearInterval(cooldownInterval)
  })
</script>
<style lang="scss" scoped>
  .loginContainer {
    border: 1px solid $primary;
  }
  /* Add this if you haven't made it global yet! */
  .hide-native-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-native-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
