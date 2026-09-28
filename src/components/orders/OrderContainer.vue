<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto relative-position q-mb-md q-pt-sm text-center">
      <div class="text-primary text-weight-bolder text-h6 ellipsis q-px-xl">
        <span v-if="isMulti">{{
          $t('title.PAGE_ORDER_MULTI') || 'Order Details - [ Multi-Package ]'
        }}</span>
        <span v-else>{{ $t('title.PAGE_ORDER') || 'Order Details' }}</span>
      </div>

      <q-btn
        icon="close"
        flat
        round
        dense
        color="grey-6"
        class="absolute-top-right q-mr-sm"
        @click="handleClose"
      />
    </div>

    <div
      class="col hide-native-scrollbar"
      style="overflow-y: auto; overflow-x: hidden; min-height: 0"
    >
      <div class="q-pb-xl full-width">
        <!-- LOADING STATE -->
        <div
          v-if="orderStore.isLoading || multiLoading"
          class="row full-width justify-center q-pa-xl"
        >
          <q-spinner-dots color="primary" size="3em" />
        </div>

        <!-- ERROR STATE -->
        <div
          v-else-if="orderStore.error || multiError"
          class="row full-width justify-center text-center q-pa-md"
        >
          <div class="col-12 text-negative text-h6 q-mb-md">
            {{ $t('msgSystem.GEN_UNEXPECTED') }}
          </div>
          <q-btn outline color="primary" :label="$t('label.GO_HOME')" @click="router.push('/')" />
        </div>

        <!-- CHECKOUT SUCCESS STATE (Confirmed Checkmark) -->
        <div
          v-else-if="route.params.id === 'confirmed'"
          class="row flex-center full-width text-center q-pa-xl"
          style="min-height: 40vh"
        >
          <div>
            <q-icon name="check_circle" size="6em" color="positive" class="q-mb-md" />
            <div class="text-h6 text-grey-8 q-mb-sm">
              {{ $t('msgSystem.ORDER_SUCCESS') }}
            </div>
            <div class="text-body2 text-grey-6 q-mb-xl">
              {{ $t('eOrder.ORDER_BODY_1') }}
            </div>
          </div>
        </div>

        <!-- MULTI ORDER VIEW (The dynamic loop!) -->
        <div v-else-if="isMulti && multiOrders.length > 0" class="full-width q-pa-sm">
          <div v-for="(ord, index) in multiOrders" :key="ord._id" class="q-mb-xl">
            <!-- Nice Blue Header for each package -->
            <div
              class="bg-primary text-white q-py-sm q-px-md row justify-between items-center"
              style="border-radius: 8px 8px 0 0"
            >
              <div class="text-subtitle1 text-weight-bold">
                <q-icon name="local_shipping" size="sm" class="q-mr-sm" />
                {{ $t('label.PACKAGE', 'Package') }} {{ index + 1 }} / {{ multiOrders.length }}
              </div>
            </div>

            <!-- REUSING YOUR UNALTERED ORDER SCOPE -->
            <OrderScope
              :order="ord"
              style="border-top-left-radius: 0; border-top-right-radius: 0"
            />
          </div>
        </div>

        <!-- SINGLE ORDER VIEW -->
        <div v-else-if="orderStore.currentOrder" class="full-width q-pa-sm">
          <OrderScope :order="orderStore.currentOrder" />
        </div>

        <!-- 404 NOT FOUND STATE -->
        <div v-else class="row flex-center full-width text-center q-pa-xl" style="min-height: 40vh">
          <div>
            <q-icon name="search_off" size="6em" color="grey-4" class="q-mb-md" />
            <div class="text-h6 text-grey-8 q-mb-sm">{{ $t('label.404') }}</div>
            <div class="text-body2 text-grey-6 q-mb-xl">{{ $t('msgSystem.GEN_UNEXPECTED') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
  import { ref, onUnmounted, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useOrderStore } from 'src/stores/order.store'
  import { useAuthStore } from 'src/stores/auth.store'
  import OrderScope from 'src/components/orders/OrderScope.vue'
  import api from 'src/utils/api'

  const route = useRoute()
  const router = useRouter()
  const orderStore = useOrderStore()
  const authStore = useAuthStore()

  // Smart Routing Close Function
  const handleClose = () => {
    if (authStore.isAuthenticated) {
      router.push('/profile?tab=orders')
    } else {
      router.push('/')
    }
  }

  // --- MULTI ORDER STATE ---
  const isMulti = ref(false)
  const multiOrders = ref([])
  const multiLoading = ref(false)
  const multiError = ref(false)

  // 🚀 FIX: Watch the route ID, Name, and Query simultaneously!
  watch(
    () => [route.params.id, route.name, route.query.ids],
    async ([newId, routeName, idsQuery]) => {
      // 1. Reset states on navigation
      isMulti.value = false
      multiOrders.value = []
      multiError.value = false
      orderStore.clearOrder()

      // 2. Are we looking at the Multi-Order Email link?
      if (routeName === 'order-multi' || idsQuery) {
        isMulti.value = true
        multiLoading.value = true

        const ids = (idsQuery || '').split(',').filter(id => id.trim() !== '')

        if (ids.length === 0) {
          multiError.value = true
          multiLoading.value = false
          return
        }

        try {
          const promises = ids.map(id => api.get(`/open/order/${id}`))
          const responses = await Promise.allSettled(promises)

          const fetchedOrders = []
          responses.forEach(res => {
            if (res.status === 'fulfilled' && res.value.data) {
              fetchedOrders.push(res.value.data)
            }
          })

          if (fetchedOrders.length === 0) {
            multiError.value = true
          } else {
            multiOrders.value = fetchedOrders
          }
        } catch {
          multiError.value = true
        } finally {
          multiLoading.value = false
        }
        return
      }

      // 3. Are we looking at a Single Order or the Confirmed checkmark?
      if (newId) {
        if (newId === 'confirmed') {
          return // The UI automatically shows the success screen
        }

        // Fetch the normal single order
        await orderStore.fetchOrderById(newId)
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    orderStore.clearOrder()
  })
</script>

<style lang="scss" scoped>
  .hide-native-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-native-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
</style>
