<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); overflow: hidden; border-radius: 16px"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_CHECKOUT') }}
    </div>

    <div class="col relative-position">
      <q-scroll-area class="absolute-full q-pr-sm">
        <div v-if="displayCart.length > 0" class="row justify-center full-width q-pb-xl">
          <div class="col-12 col-xl-10">
            <CheckOut :items="displayCart" :total="displayTotal" />
          </div>
        </div>

        <div
          v-else
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
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
  import { ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { useCartStore } from 'src/stores/cart.store'
  import CheckOut from 'src/components/checkout/CheckoutScope.vue'

  const cartStore = useCartStore()
  const { detailedCart, cartTotal } = storeToRefs(cartStore)

  // 🚀 FIX: Create frozen snapshot refs
  const displayCart = ref([])
  const displayTotal = ref(0)

  // Watch the real cart for changes
  watch(
    detailedCart,
    newCart => {
      // If the cart has items, update our snapshot.
      // If the cart suddenly becomes empty (e.g., successful order placed),
      // we DO NOT update the snapshot. The UI freezes perfectly until the router navigates away!
      if (newCart && newCart.length > 0) {
        displayCart.value = [...newCart]
        displayTotal.value = cartTotal.value
      }
    },
    { deep: true, immediate: true }
  )
</script>

<style lang="scss" scoped>
  /* Removed the .cartContainer border so it uses our clean shadow-3 elevation! */
</style>
