<template>
  <div
    v-if="productsMostPopular.length > 0"
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-md text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.HOME_MOST_POPULAR') }}
    </div>

    <div class="col relative-position">
      <q-btn
        v-if="canScrollLeft"
        class="nav-btn left bg-white text-primary shadow-2"
        flat
        round
        icon="chevron_left"
        @click.stop="handleLeftClick"
      />
      <q-btn
        v-if="canScrollRight"
        class="nav-btn right bg-white text-primary shadow-2"
        flat
        round
        icon="chevron_right"
        @click.stop="handleRightClick"
      />

      <q-scroll-area
        ref="scrollArea"
        :thumb-style="thumbStyle"
        :bar-style="barStyle"
        class="row full-width"
        style="height: 220px"
      >
        <div v-if="productsMostPopular.length > 0" class="row no-wrap q-py-xs q-px-sm">
          <div
            v-for="product in productsMostPopular"
            :key="product.id"
            class="q-mx-md cursor-pointer"
            @click="handleCardClick('product', product.id, $event)"
          >
            <MostPopularScope :product="product" />
          </div>
        </div>

        <!-- <div v-else class="row no-wrap q-py-xs q-px-sm">
          <div v-for="n in 18" :key="n" class="q-mx-sm">
            <MostPopularScope :product="null" />
          </div>
        </div> -->
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
  import { ref } from 'vue'
  import { storeToRefs } from 'pinia'

  // Components & Stores
  import MostPopularScope from 'src/components/popular/MostPopularScope.vue'
  import { usePRStore } from 'src/stores/products.store'
  import { useHorizontalScroll } from 'src/composables/useHorizontalScroll'

  const productStore = usePRStore()

  // Backend already limits this to 18 items
  const { productsMostPopular } = storeToRefs(productStore)

  const scrollArea = ref(null)

  // Extract all the heavy lifting from the composable
  const {
    canScrollLeft,
    canScrollRight,
    handleLeftClick,
    handleRightClick,
    handleCardClick,
    thumbStyle,
    barStyle
  } = useHorizontalScroll(scrollArea)
</script>

<style lang="scss" scoped>
  .nav-btn {
    position: absolute;
    top: 30%; /* Perfect vertical centering */
    transform: translateY(-50%);
    z-index: 2;
    opacity: 0.9;
    transition: opacity 0.3s;

    &:hover {
      opacity: 1;
    }

    &.left {
      left: 5px;
    }

    &.right {
      right: 5px;
    }
  }
</style>
