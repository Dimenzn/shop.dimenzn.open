<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto ellipsis q-mb-sm text-center text-primary text-weight-bolder text-h6">
      {{ $t('title.PAGE_PROFILE') }}
    </div>

    <div class="col-auto">
      <q-tabs
        v-model="tab"
        dense
        class="text-grey q-mx-md"
        active-color="primary"
        indicator-color="primary"
        align="justify"
        narrow-indicator
      >
        <q-tab name="details" :label="$t('label.TAB_DETAILS')" icon="person" />
        <q-tab name="orders" :label="$t('label.TAB_ORDERS')" icon="receipt_long" />
      </q-tabs>
      <q-separator inset class="q-mb-sm" />
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md">
        <div class="fit">
          <q-tab-panels v-model="tab" animated class="bg-transparent">
            <q-tab-panel name="details" class="q-px-none">
              <q-form ref="profileForm" @submit.prevent="saveProfile" class="q-gutter-y-md q-pt-sm">
                <div class="text-subtitle1 text-primary text-weight-bold">
                  {{ $t('label.CUSTOMER_DETAILS') }}
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-12 col-sm-6">
                    <q-input
                      outlined
                      dense
                      v-model="formData.firstName"
                      :label="$t('label.FIELD_FIRST_NAME')"
                      :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      outlined
                      dense
                      v-model="formData.lastName"
                      :label="$t('label.FIELD_LAST_NAME')"
                      :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
                    />
                  </div>
                  <div class="col-12 col-lg-6">
                    <q-input
                      outlined
                      dense
                      v-model="formData.email"
                      :label="$t('label.FIELD_EMAIL')"
                      readonly
                      disable
                      hint=""
                    />
                  </div>

                  <div class="col-12 col-lg-6">
                    <div class="row q-col-gutter-sm">
                      <div class="col-4 col-sm-4 col-md-3">
                        <q-select
                          outlined
                          dense
                          v-model="phonePrefix"
                          :options="filteredPhoneCodes"
                          option-value="value"
                          option-label="value"
                          emit-value
                          map-options
                          :label="$t('label.FIELD_CODE')"
                          :disable="!isInternational"
                          behavior="menu"
                          :rules="[val => !!val || $t('label.FIELD_CODE')]"
                          hide-bottom-space
                        >
                          <template v-slot:option="scope">
                            <q-item v-bind="scope.itemProps">
                              <q-item-section>
                                <q-item-label>{{ scope.opt.label }}</q-item-label>
                                <q-item-label caption>{{ scope.opt.value }}</q-item-label>
                              </q-item-section>
                            </q-item>
                          </template>
                        </q-select>
                      </div>
                      <div class="col-8 col-sm-8 col-md-9">
                        <q-input
                          outlined
                          dense
                          v-model="formData.phone"
                          :label="$t('label.FIELD_PHONE')"
                          mask="phone"
                          unmasked-value
                          :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="text-subtitle1 text-primary text-weight-bold q-mt-lg">
                  {{ $t('label.SHIPPING_TO') }}
                </div>

                <div class="row q-col-gutter-sm">
                  <div class="col-12">
                    <q-input
                      outlined
                      dense
                      v-model="formData.address"
                      :label="$t('label.FIELD_ADDRESS')"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      outlined
                      dense
                      v-model="formData.city"
                      :label="$t('label.FIELD_CITY')"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-input
                      outlined
                      dense
                      v-model="formData.postalCode"
                      :label="$t('label.FIELD_POSTAL_CODE')"
                    />
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-select
                      :disable="!isInternational"
                      outlined
                      dense
                      v-model="formData.country"
                      :label="$t('label.FIELD_COUNTRY')"
                      :options="allowedCountryOptions"
                      :rules="[val => !!val || $t('label.VAL_REQUIRED')]"
                    />
                  </div>
                </div>

                <div class="row justify-start q-mt-xs q-col-gutter-sm items-center">
                  <div class="col-auto">
                    <q-btn
                      :label="$t('button.BTN_SAVE')"
                      color="primary"
                      unelevated
                      type="submit"
                      :loading="isSaving"
                      icon="save"
                      class="rounded-borders q-px-md text-weight-bold"
                    />
                  </div>
                  <div class="col-auto">
                    <q-btn
                      :label="$t('button.BTN_CLEAR')"
                      color="grey-7"
                      flat
                      icon="clear_all"
                      @click="clearForm"
                    />
                  </div>
                </div>
              </q-form>
            </q-tab-panel>

            <q-tab-panel name="orders" class="q-px-none">
              <div v-if="orderStore.isLoading" class="row justify-center q-pa-xl">
                <q-spinner-dots color="primary" size="3em" />
              </div>

              <div
                v-else-if="!ordersList || ordersList.length === 0"
                class="text-center text-grey-6 q-pa-xl"
              >
                <q-icon name="shopping_bag" size="4em" class="q-mb-md" />
                <div>{{ $t('msgSystem.ORDER_EMPTY_SIMPLE') }}</div>
              </div>

              <div v-else style="max-width: 100%; overflow-x: auto">
                <q-table
                  :rows="ordersList"
                  :columns="orderColumns"
                  row-key="_id"
                  flat
                  class="bg-transparent"
                  :pagination="{ rowsPerPage: 10 }"
                  style="white-space: nowrap"
                >
                  <template v-slot:body-cell-status="props">
                    <q-td :props="props">
                      <q-chip
                        dense
                        square
                        text-color="white"
                        :color="getStatusColor(props.row.status)"
                      >
                        {{ getStatusLabel(props.row.status) }}
                      </q-chip>
                    </q-td>
                  </template>
                  <template v-slot:body-cell-actions="props">
                    <q-td :props="props" auto-width>
                      <q-btn
                        flat
                        dense
                        round
                        color="primary"
                        icon="visibility"
                        @click="goToOrder(props.row._id)"
                      />
                    </q-td>
                  </template>
                </q-table>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </div>
      </q-scroll-area>
    </div>
    <q-separator inset class="q-my-sm" />
    <div class="col-auto row justify-end q-px-md q-pb-md">
      <q-btn
        outline
        color="negative"
        icon="logout"
        :label="$t('button.BTN_LOGOUT')"
        class="rounded-borders text-weight-bold"
        @click="logout()"
      />
    </div>
  </div>
</template>
<script setup>
  import { ref, reactive, onMounted, nextTick, computed, watch } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useOrderStore } from 'src/stores/order.store' // <--- CHANGED
  import { useNotifyStore } from 'src/stores/notify.store'
  import { useI18n } from 'vue-i18n'
  import { useUIStore } from 'src/stores/ui.store'
  import phoneCodes from 'src/utils/phoneCodes'
  import { date } from 'quasar'

  const { t, locale } = useI18n()
  const router = useRouter()
  const route = useRoute()
  const authStore = useAuthStore()
  const orderStore = useOrderStore() // <--- CHANGED
  const notifyStore = useNotifyStore()
  const uiStore = useUIStore()

  // --- TABS & STATE ---
  const tab = ref('details')
  const isSaving = ref(false)
  const profileForm = ref(null)
  const phoneInputRef = ref(null)

  // --- COMPUTED ORDER LIST (From Store) ---
  const ordersList = computed(() => orderStore.orders)

  // 1. Settings from Store
  const isInternational = computed(() => uiStore.ui[0]?.showCountry ?? false)
  const defaultCountry = computed(() => uiStore.ui[0]?.defaultCountry || 'United States')
  const allowedCountryOptions = computed(() => uiStore.ui[0]?.allowedCountries || [])

  const filteredPhoneCodes = computed(() => {
    const allowed = allowedCountryOptions.value
    return phoneCodes.filter(code => allowed.includes(code.label))
  })

  // 2. Derive Default Prefix
  const defaultPhonePrefix = computed(() => {
    const match = phoneCodes.find(c => c.label === defaultCountry.value)
    return match ? match.value : '+1'
  })

  // Current selected prefix
  const phonePrefix = ref('')

  const formData = reactive({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    country: ''
  })

  // --- HELPERS ---
  const formattedPrice = price => {
    try {
      return new Intl.NumberFormat([locale.value]).format(price)
    } catch {
      return price
    }
  }

  const getStatusLabel = status => {
    switch (status) {
      case 'pending':
        return t('label.ORDER_PENDING')
      case 'confirmed':
        return t('label.ORDER_CONFIRM')
      case 'shipped':
        return t('label.ORDER_SHIP')
      case 'delivered':
        return t('label.ORDER_DELIVER')
      case 'cancelled':
        return t('label.ORDER_CANCEL')
      case 'cancelled_restored':
        return t('label.ORDER_CANCEL')
      default:
        return status // Fallback to raw value if unknown
    }
  }

  const getStatusColor = status => {
    switch (status) {
      case 'pending':
        return 'warning'
      case 'confirmed':
        return 'info'
      case 'shipped':
        return 'primary'
      case 'delivered':
        return 'positive'
      case 'cancelled':
        return 'negative'
      case 'cancelled_restored':
        return 'negative'
      default:
        return 'grey'
    }
  }

  const logout = async () => {
    try {
      await authStore.logout()
      //router.replace({ path: '/' })
    } catch (error) {
      console.error('AUTH_LOGOUT_ERR:', error)
    }
  }

  const goToOrder = id => {
    router.push({ name: 'order', params: { id } })
  }

  // --- ORDER COLUMNS ---
  const orderColumns = computed(() => [
    {
      name: 'id',
      label: t('label.ORDER_ID'),
      align: 'left',
      field: row => row._id.substring(0, 8) + '...', // Short ID
      sortable: false
    },
    {
      name: 'date',
      label: t('label.TBL_DATE'), // Add 'TBL_DATE' to i18n later if needed
      align: 'left',
      field: row => date.formatDate(row.createdAt, 'DD/MM/YYYY'),
      sortable: true
    },
    {
      name: 'total',
      label: t('label.TBL_TOTAL'),
      align: 'right',
      field: row => `${formattedPrice(row.totalAmount)} ${row.currency || ''}`,
      sortable: true
    },
    {
      name: 'status',
      label: 'Status',
      align: 'center',
      field: 'status',
      sortable: true
    },
    { name: 'actions', label: '', align: 'center' }
  ])

  // --- FETCH LOGIC ---
  // Watch for tab change
  watch(tab, newVal => {
    if (newVal === 'orders') {
      // Only fetch if empty to save bandwidth, or force every time if you prefer
      if (orderStore.orders.length === 0) {
        orderStore.fetchMyOrders()
      }
    }
  })

  // --- POPULATE LOGIC ---
  const populateForm = () => {
    if (!authStore.userProfile) return

    formData.firstName = authStore.userProfile.firstName || ''
    formData.lastName = authStore.userProfile.lastName || ''
    formData.email = authStore.userProfile.email || ''

    if (authStore.userProfile.shippingAddress) {
      formData.address = authStore.userProfile.shippingAddress.address || ''
      formData.city = authStore.userProfile.shippingAddress.city || ''
      formData.postalCode = authStore.userProfile.shippingAddress.postalCode || ''
      formData.country = authStore.userProfile.shippingAddress.country || ''
    }

    // Country Logic
    const storedCountry = authStore.userProfile.shippingAddress?.country || ''

    if (isInternational.value) {
      if (allowedCountryOptions.value.includes(storedCountry)) {
        formData.country = storedCountry
      } else {
        formData.country = ''
      }
    } else {
      formData.country = defaultCountry.value
    }

    // Phone Logic
    const fullPhone = authStore.userProfile.phone || ''
    let targetPrefix = ''

    if (isInternational.value) {
      const found = filteredPhoneCodes.value.find(p => fullPhone.startsWith(p.value))
      targetPrefix = found ? found.value : ''
    } else {
      targetPrefix = defaultPhonePrefix.value
    }

    phonePrefix.value = targetPrefix

    const knownPrefix = phoneCodes.find(p => fullPhone.startsWith(p.value))
    if (knownPrefix) {
      let localPart = fullPhone.replace(knownPrefix.value, '')
      formData.phone = localPart
    } else {
      formData.phone = fullPhone
    }
  }

  // --- MOUNT ---
  onMounted(() => {
    populateForm()
    if (route.query.tab === 'orders') {
      tab.value = 'orders'
    }
    // If user lands directly on orders tab
    if (tab.value === 'orders') {
      orderStore.fetchMyOrders()
    }
  })

  // --- CLEAR ---
  const clearForm = () => {
    formData.firstName = ''
    formData.lastName = ''
    formData.phone = ''
    formData.address = ''
    formData.city = ''
    formData.postalCode = ''

    if (!isInternational.value) {
      formData.country = defaultCountry.value
      phonePrefix.value = defaultPhonePrefix.value
    } else {
      formData.country = ''
      phonePrefix.value = ''
    }

    nextTick(() => {
      profileForm.value?.resetValidation()
    })
  }

  // --- SAVE ---
  const saveProfile = async () => {
    if (isInternational.value && !phonePrefix.value) {
      notifyStore.notify(400, t('label.VAL_REQUIRED'))
      phoneInputRef.value?.validate()
      return
    }

    isSaving.value = true
    try {
      const payload = { ...formData }

      if (phonePrefix.value && formData.phone) {
        payload.phone = `${phonePrefix.value}${formData.phone}`
      }

      if (!isInternational.value) {
        payload.country = defaultCountry.value
      }
      console.log(payload)
      await authStore.updateUserProfile({
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        shippingAddress: {
          address: payload.address,
          city: payload.city,
          postalCode: payload.postalCode,
          country: payload.country
        }
      })
      notifyStore.notify(200, t('msgSystem.DATA_SAVE_SUCCESS'))
    } catch (error) {
      console.error(error)
    } finally {
      isSaving.value = false
    }
  }
</script>

<style lang="scss" scoped></style>
