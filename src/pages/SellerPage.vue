<template>
  <div>
    <div class="row full-width justify-center">
      <div class="col-xs-12 col-xl-10">
        <SellerContainer />
      </div>
    </div>
  </div>
</template>
<script setup>
  import { onMounted } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useSellerStore } from 'src/stores/seller.store'

  import SellerContainer from 'src/components/seller/SellerContainer.vue'

  const route = useRoute()
  const router = useRouter()
  const sellerStore = useSellerStore()

  onMounted(async () => {
    // 1. Grab the ID from the URL (e.g., /seller/69c7052...)
    const sellerId = route.params.id

    // Safety fallback if the route is somehow missing the ID
    if (!sellerId) {
      router.push({ name: 'error404' }) // 👈 Adjust if your 404 route is named differently
      return
    }

    // 2. Fetch the profile from the backend
    const response = await sellerStore.fetchSellerProfile(sellerId)

    // 3. THE DEADBOLT: If the backend says "No" (because they are suspended or deleted)
    if (!response.success) {
      console.warn('Storefront Access Denied: Seller may be suspended.')
      router.push({ name: 'error404' }) // Redirect buyers to a 404 error page!
    }
  })
</script>
