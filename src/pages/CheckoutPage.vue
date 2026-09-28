<template>
  <div>
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-xl-10">
        <CheckoutDigitalContainer v-if="route.name === 'checkout-digital'" />
        <CheckoutContainer v-else />
      </div>
    </div>
  </div>
</template>

<script setup>
  import { useRoute } from 'vue-router'
  import CheckoutContainer from 'src/components/checkout/CheckoutContainer.vue'
  import CheckoutDigitalContainer from 'src/components/checkout/CheckoutDigitalContainer.vue'
  const route = useRoute()
</script>
