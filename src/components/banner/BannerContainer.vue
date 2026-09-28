<template>
  <BannerScope :ads="adsBanner" :top-sellers="topSellers" />
</template>

<script setup>
  import { ref, onMounted } from 'vue'
  import { storeToRefs } from 'pinia'

  import { useADStore } from 'src/stores/ads.store'
  import api from 'src/utils/api' // Make sure this path matches your Axios instance

  import BannerScope from 'src/components/banner/BannerScope.vue'

  const adsStore = useADStore()
  const { adsBanner } = storeToRefs(adsStore)

  // 🌟 NEW: State to hold our top sellers
  const topSellers = ref([])

  // 🌟 NEW: Fetch the top sellers when the homepage loads
  onMounted(async () => {
    try {
      const response = await api.get('/open/top-sellers')
      if (response.data && response.data.sellers) {
        topSellers.value = response.data.sellers
      }
    } catch (error) {
      console.error('Failed to fetch top sellers for banner:', error)
    }
  })
</script>
