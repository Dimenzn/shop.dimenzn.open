<template>
  <div
    v-if="productsNewArrivals && productsNewArrivals.length > 0"
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-md text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.HOME_NEW_ARRIVALS') }}
    </div>

    <div class="col relative-position">
      <template v-if="productsNewArrivals && productsNewArrivals.length > 0">
        <q-infinite-scroll @load="onLoadMore" :offset="250" :disable="isDone">
          <div class="row justify-center">
            <div
              v-for="product in productsNewArrivals"
              :key="product.id"
              class="col-auto q-mx-sm q-my-sm cursor-pointer"
              @click="handleCardClick(product.id)"
            >
              <NewArrivalScope :product="product" />
            </div>
          </div>

          <template v-slot:loading>
            <div class="row justify-center q-my-lg" style="height: 40px; align-items: center">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template>
        </q-infinite-scroll>

        <div
          v-if="isDone"
          class="row justify-center q-my-lg"
          style="height: 40px; align-items: center"
        >
          <q-chip dense flat color="transparent" text-color="grey-5" class="text-weight-bold">
            {{ $t('label.NO_MORE_PRODUCTS', "You've reached the end") }}
          </q-chip>
        </div>
      </template>

      <!-- <template v-else>
        <div class="row justify-center">
          <div v-for="n in 18" :key="n" class="col-auto q-mx-sm q-my-sm">
            <NewArrivalScope :product="null" />
          </div>
        </div>
      </template> -->
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'

  import { usePRStore } from 'src/stores/products.store'
  import NewArrivalScope from 'src/components/arrivals/NewArrivalScope.vue'

  const router = useRouter()
  const productStore = usePRStore()

  const { productsNewArrivals } = storeToRefs(productStore)

  // 🌟 NEW: Track if we hit the end of the database
  const isDone = ref(false)

  // 🌟 NEW: Triggered automatically by <q-infinite-scroll>
  const onLoadMore = async (index, done) => {
    // Call our new store action
    const hasMoreData = await productStore.loadMoreNewArrivals()

    if (!hasMoreData) {
      isDone.value = true // Permanently disable the scroll listener
      done(true)
    } else {
      done() // Tell Quasar to hide the spinner and wait for the next scroll
    }
  }

  // --- Actions ---
  const handleCardClick = id => {
    router.push(`/product/${id}`)
  }
</script>
