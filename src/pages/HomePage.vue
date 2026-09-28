<template>
  <q-page class="overflow-hidden" style="height: 100dvh">
    <q-scroll-area ref="mainScrollAreaRef" style="height: calc(100dvh - 30px)">
      <div class="row full-width justify-center" style="padding-bottom: 75px">
        <div class="col-xs-12 col-xl-10">
          <BannerContainer />
        </div>

        <div class="col-xs-12 col-xl-10">
          <MostPremiumContainer />
        </div>

        <div class="col-xs-12 col-xl-10">
          <MostPopularContainer />
        </div>

        <div class="col-xs-12 col-xl-10">
          <NewArrivalsContainer />
        </div>
      </div>
    </q-scroll-area>
  </q-page>
</template>

<script setup>
  import { ref, provide, onMounted, inject } from 'vue'

  // --- Components ---
  import BannerContainer from 'src/components/banner/BannerContainer.vue'
  import MostPopularContainer from 'src/components/popular/MostPopularContainer.vue'
  import MostPremiumContainer from 'src/components/premium/MostPremiumContainer.vue'
  import NewArrivalsContainer from 'src/components/arrivals/NewArrivalsContainer.vue'

  // --- Stores ---
  import { usePRStore } from 'src/stores/products.store'
  import { useADStore } from 'src/stores/ads.store'

  // --- State & Composables ---
  const prStore = usePRStore()
  const adStore = useADStore()

  const mainScrollAreaRef = ref(null)
  const scrollController = inject('scrollController', null)

  // Provide the ref so child components (like Nav) can use it without prop drilling
  provide('mainScroll', mainScrollAreaRef)

  // --- Lifecycle ---
  onMounted(async () => {
    // 1. Register this specific scroll area with the parent layout
    if (scrollController) {
      scrollController.register(mainScrollAreaRef.value)
    }

    // 2. Fetch page-specific data (Moved here from the Router for better performance)
    // We don't block the UI rendering while fetching; Vue will naturally react when the data arrives!
    try {
      await Promise.all([prStore.fetchHomeProducts(), adStore.fetchAds()])
    } catch (error) {
      console.error('HomePage: Failed to load products or ads', error)
    }
  })
</script>
