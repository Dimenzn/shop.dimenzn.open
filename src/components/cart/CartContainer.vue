<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_CART') }}
    </div>

    <div class="col relative-position" style="min-height: 0">
      <q-scroll-area class="absolute-full q-px-sm" :content-style="{ width: '100%' }">
        <div class="row justify-center full-width q-pb-xl">
          <div class="col-12 col-xl-10">
            <div
              v-if="!detailedCart || detailedCart.length === 0"
              class="column items-center justify-center text-center text-grey-6 q-pa-xl"
              style="min-height: 50vh"
            >
              <q-icon name="remove_shopping_cart" size="5em" class="q-mb-md text-grey-4" />
              <div class="text-h6 text-weight-bold q-mb-xs">
                {{ $t('title.CART_EMPTY') }}
              </div>
              <div class="text-body2">
                {{ $t('label.CART_EMPTY_DESC') }}
              </div>
            </div>

            <CartScope v-else :items="detailedCart" :total="cartTotal" />
          </div>
        </div>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
  // 1. Library Imports
  import { storeToRefs } from 'pinia'

  // 2. Store Imports
  import { useCartStore } from 'src/stores/cart.store'

  // 3. Component Imports
  import CartScope from 'src/components/cart/CartScope.vue'

  const cartStore = useCartStore()

  // Extract reactive arrays and values from the store
  const { detailedCart, cartTotal } = storeToRefs(cartStore)
</script>
