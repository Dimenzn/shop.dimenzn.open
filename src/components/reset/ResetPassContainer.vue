<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: 97dvh; border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_RESET_PASS') }}
    </div>

    <div
      class="col hide-native-scrollbar"
      style="overflow-y: auto; overflow-x: hidden; min-height: 0"
    >
      <div class="q-pb-xl full-width flex flex-center" style="min-height: 100%">
        <div v-if="!token" class="column items-center justify-center text-center q-pa-xl">
          <q-icon name="error_outline" color="negative" size="5em" class="q-mb-md" />
          <div class="text-h6 text-weight-bold q-mb-lg">{{ $t('label.INVALID_TOKEN') }}</div>
          <q-btn
            unelevated
            color="primary"
            to="/login"
            :label="$t('button.BTN_GO_LOGIN')"
            class="rounded-borders text-weight-bold q-px-xl q-py-sm"
          />
        </div>

        <q-form
          v-else
          @submit="handleResetPassword"
          class="full-width q-px-md"
          style="max-width: 400px"
        >
          <div class="text-subtitle1 text-center q-mb-xl text-grey-8">
            {{ $t('label.ENTER_NEW_PASS') }}
          </div>

          <q-input
            outlined
            v-model="password"
            :label="$t('label.FIELD_NEW_PASSWORD')"
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
              color="primary"
              type="submit"
              :loading="isSubmitting"
              class="full-width q-py-sm text-weight-bold"
            >
              {{ $t('button.BTN_UPDATE_PASS') }}
            </q-btn>
            <q-btn flat color="primary" class="full-width" no-caps to="/login">
              {{ $t('title.PAGE_LOGIN') }}
            </q-btn>
          </div>
        </q-form>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useAuthStore } from 'src/stores/auth.store'

  const route = useRoute()
  const router = useRouter()
  const authStore = useAuthStore()

  const password = ref('')
  const passwordConfirm = ref('')
  const isSubmitting = ref(false)

  // Extract the secure token from URL (e.g., /reset-password?token=abc123)
  const token = route.query.token

  const handleResetPassword = async () => {
    if (!token) return

    isSubmitting.value = true
    try {
      await authStore.resetPassword({
        token: token,
        newPassword: password.value
      })

      // Success! The interceptor will show the success message.
      // We just boot them back to the login page so they can sign in!
      router.push('/login')
    } catch (error) {
      console.error('Password reset failed:', error)
      // Interceptor handles the error notification (e.g., Token Expired)
    } finally {
      isSubmitting.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .loginContainer {
    border: 1px solid $primary;
  }
</style>
