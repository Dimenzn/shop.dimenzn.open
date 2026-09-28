<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); overflow: hidden; border-radius: 16px"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_EXPRESS_CHECKOUT', 'Express Checkout') }}
    </div>

    <div class="col relative-position">
      <q-scroll-area class="absolute-full q-pr-sm">
        <div
          v-if="isLoading"
          class="column items-center justify-center text-center text-grey-6 q-pa-xl"
          style="min-height: 50vh"
        >
          <q-spinner-dots color="primary" size="4em" />
          <div class="text-h6 text-grey-6 q-mt-md">
            {{ $t('label.LOADING_SECURE_CHECKOUT', 'Loading Secure Checkout...') }}
          </div>
        </div>

        <div v-else-if="displayProduct" class="row justify-center full-width q-pb-xl">
          <div class="col-12 col-xl-10">
            <CheckoutDigitalScope :product="displayProduct" />
          </div>
        </div>

        <div
          v-else
          class="column items-center justify-center text-center text-grey-6 q-pa-xl"
          style="min-height: 50vh"
        >
          <q-icon name="error_outline" size="5em" class="q-mb-md text-grey-4" />
          <div class="text-h6 text-weight-bold q-mb-xs">
            {{ $t('title.PROD_NOT_FOUND', 'Product Not Found') }}
          </div>
          <div class="text-body2 text-grey-6">
            {{
              $t(
                'label.PROD_NOT_FOUND_DESC',
                'The digital key you are trying to purchase does not exist or is unavailable.'
              )
            }}
          </div>
          <q-btn color="primary" outline rounded class="q-mt-lg" @click="router.push('/')">
            {{ $t('button.BTN_GO_HOME', 'Go to Homepage') }}
          </q-btn>
        </div>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import api from 'src/utils/api'

  import CheckoutDigitalScope from 'src/components/checkout/CheckoutDigitalScope.vue'

  const route = useRoute()
  const router = useRouter()

  // 🚀 The equivalent of your "frozen snapshot"
  const displayProduct = ref(null)
  const isLoading = ref(true)

  onMounted(async () => {
    try {
      const productId = route.params.id
      if (!productId) throw new Error('No ID provided')

      // 🌟 THE FIX: Change "products" to "product" (singular)
      const response = await api.get(`/open/product/${productId}`)

      if (response.data) {
        displayProduct.value = response.data
      }
    } catch (error) {
      console.error('Failed to load express checkout item:', error)
      // If it fails, displayProduct remains null, triggering State 3 (Error)
    } finally {
      // Turn off the spinner whether it succeeded or failed
      isLoading.value = false
    }
  })
</script>

<style lang="scss" scoped>
  /* Removed the .cartContainer border so it uses our clean shadow-3 elevation! */
</style>
