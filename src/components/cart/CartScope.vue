<template>
  <div class="row q-col-gutter-lg q-pb-md" v-if="items && items.length > 0">
    <div class="col-xs-12 col-md-8">
      <div
        v-for="item in items"
        :key="item.productId + '-' + (item.size || 'base')"
        class="q-mb-md"
      >
        <q-card flat bordered class="row full-width overflow-hidden rounded-borders">
          <div @click="viewProduct(item)" class="col-xs-12 col-sm-8 cursor-pointer q-pa-sm">
            <div class="row items-center no-wrap full-height">
              <div class="col-auto q-pr-md">
                <q-img
                  style="width: 80px; height: 80px"
                  :src="item.product.image"
                  :error-src="imageError"
                  :ratio="1"
                  class="rounded-borders"
                />
              </div>
              <div class="col text-dark text-weight-regular">
                <div class="text-subtitle1 line-height-small">
                  <span v-if="item.size" class="text-bold text-primary"> {{ item.size }} - </span>
                  {{ item.product.title }}
                </div>
                <q-badge v-if="hasDiscount(item.product)" color="negative" class="q-mt-xs" rounded>
                  {{ $t('label.SALE') }}
                </q-badge>
              </div>
            </div>
          </div>

          <div class="col-xs-12 col-sm-4 bg-grey-1 q-pa-sm column justify-between">
            <div class="row justify-between items-start">
              <div class="text-subtitle2 text-grey-8">x{{ item.quantity }}</div>

              <div class="text-right">
                <template v-if="hasDiscount(item.product)">
                  <div class="text-caption text-strike text-grey-6 line-height-small">
                    {{ formattedPrice(item.product.price * item.quantity) }}
                  </div>
                  <div class="text-subtitle1 text-negative text-weight-bold">
                    {{ formattedPrice(item.product.discountPrice * item.quantity) }}
                    <span class="text-caption text-grey-8">{{ currency }}</span>
                  </div>
                </template>
                <template v-else>
                  <div class="text-subtitle1 text-weight-bold">
                    {{ formattedPrice(item.product.price * item.quantity) }}
                    <span class="text-caption text-grey-8">{{ currency }}</span>
                  </div>
                </template>
              </div>
            </div>

            <q-separator class="q-my-sm" />

            <div class="row justify-between items-center">
              <div class="row q-gutter-x-sm">
                <q-btn
                  outline
                  dense
                  size="sm"
                  color="grey-7"
                  icon="remove"
                  @click="removeQty(item)"
                />
                <q-btn outline dense size="sm" color="grey-7" icon="add" @click="addQty(item)" />
              </div>
              <q-btn
                flat
                dense
                size="sm"
                color="negative"
                icon="delete_outline"
                @click="removeProduct(item)"
              />
            </div>
          </div>
        </q-card>
      </div>
    </div>

    <div class="col-xs-12 col-md-4">
      <div style="position: sticky; top: 0">
        <q-card flat bordered class="bg-grey-1 q-pa-md rounded-borders">
          <div class="text-h6 text-primary q-mb-md">{{ $t('label.PRICE_TOTAL') }}</div>

          <q-separator class="q-mb-md" />

          <div class="row justify-between items-end q-mb-lg">
            <div class="col-12 text-right text-primary text-h5 text-bold">
              {{ formattedPrice(total) }}
              <span class="text-subtitle2">{{ currency }}</span>
            </div>
          </div>

          <q-btn
            rounded
            class="full-width"
            size="lg"
            color="primary"
            :label="$t('label.BTN_GO_TO_CHECKOUT')"
            @click="checkoutProcess"
            :loading="isCheckingOut"
            unelevated
          />
        </q-card>
      </div>
    </div>
  </div>
</template>

<script setup>
  // 1. Vue & Library Imports
  import { computed, ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { useI18n } from 'vue-i18n'

  // 2. Store Imports
  import { useCartStore } from 'src/stores/cart.store'
  import { useNotifyStore } from 'src/stores/notify.store'
  import { useUIStore } from 'stores/ui.store'

  // 3. Assets
  import imageError from 'src/assets/no.image.1.1.png'

  // --- Props ---
  defineProps({
    items: { type: Array, required: true },
    total: { type: Number, required: true }
  })

  // --- Composables & Stores ---
  const router = useRouter()
  const cartStore = useCartStore()
  const notifyStore = useNotifyStore()
  const uiStore = useUIStore()
  const { locale, t } = useI18n({ useScope: 'global' })

  // --- State ---
  const isCheckingOut = ref(false)

  // --- Computed ---
  const currency = computed(() => uiStore.ui[0]?.currency || '')

  // --- Helpers ---
  const hasDiscount = product => {
    return (
      product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price
    )
  }

  const formattedPrice = price => {
    if (typeof price !== 'number') return 'n/a'
    try {
      return new Intl.NumberFormat([locale.value]).format(price)
    } catch {
      return 'n/a'
    }
  }

  // --- Actions ---
  const addQty = item => {
    if (item.quantity >= item.maxQuantity) {
      // FIX: Added the translation wrapper `t()`
      notifyStore.notify(400, t('msgSystem.STOCK_EMPTY'))
      return
    }
    cartStore.updateQuantity(item.productId, item.size, item.quantity + 1)
  }

  const removeQty = item => {
    cartStore.updateQuantity(item.productId, item.size, item.quantity - 1)
  }

  const removeProduct = item => {
    cartStore.removeItem(item.productId, item.size)
  }

  const viewProduct = item => {
    router.push('/product/' + item.productId)
  }

  const checkoutProcess = async () => {
    isCheckingOut.value = true
    try {
      const oldTotal = cartStore.cartTotal

      // Force a silent background refresh to verify prices haven't changed
      await cartStore.loadCartDetails(true)

      if (oldTotal !== cartStore.cartTotal) {
        notifyStore.notify(400, t('msgSystem.PRICE_CHANGED_REVIEW'))
        return
      }

      const isStockVerified = await cartStore.verifyCartStock()

      if (isStockVerified) {
        router.push('/checkout')
      } else {
        console.warn('Checkout aborted: Stock verification failed.')
      }
    } catch (error) {
      console.error('An unexpected error occurred during checkout:', error)
      notifyStore.notify(500, t('msgSystem.GEN_UNEXPECTED'))
    } finally {
      isCheckingOut.value = false
    }
  }
</script>

<style lang="scss" scoped>
  .line-height-small {
    line-height: 1.1;
  }
</style>
