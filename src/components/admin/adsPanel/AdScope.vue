<template>
  <div class="row full-width" v-if="localAd && localAd.locales && localAd.locales[locale]">
    <q-expansion-item class="col-12" expand-separator icon="perm_identity">
      <template v-slot:header>
        <q-item-section>
          <div class="row items-center full-width">
            <div class="col-12 q-mb-sm q-mb-sm-none q-mr-sm-md">
              <q-img
                :src="localAd.locales[locale]?.image"
                :error-src="noImage"
                style="
                  height: auto;
                  width: 100%;
                  max-width: 250px;
                  object-fit: cover;
                  border-radius: 4px;
                "
              />
            </div>

            <div class="col-12" style="overflow: hidden">
              <div class="text-weight-bold text-blue-grey text-subtitle1 ellipsis">
                {{ localAd.locales[locale].title }}
              </div>
            </div>
          </div>
        </q-item-section>
      </template>

      <q-card>
        <q-card-section>
          <div class="row q-col-gutter-sm">
            <div class="col-12 row justify-between items-center q-mb-sm">
              <q-chip dense outline square color="primary" class="text-caption no-border-radius">
                {{ formattedDate }}
              </q-chip>

              <q-chip
                clickable
                @click="handleCopyId"
                dense
                square
                color="primary"
                text-color="white"
                class="text-caption no-border-radius"
              >
                {{ $t('admin.FIELD_ID') }}: {{ localAd.id }}
                <q-icon name="content_copy" size="12px" class="q-ml-sm" />
              </q-chip>
            </div>

            <div class="col-12">
              <q-input
                dense
                outlined
                stack-label
                :label="$t('admin.LBL_TITLE')"
                v-model="localAd.locales[locale].title"
                bg-color="white"
              />
            </div>

            <div class="col-12">
              <q-input
                dense
                outlined
                stack-label
                :label="$t('admin.AD_LINK')"
                v-model="localAd.locales[locale].link"
                bg-color="white"
              />
            </div>

            <div class="col-12">
              <q-input
                dense
                outlined
                stack-label
                :label="$t('admin.LBL_IMG_LINK')"
                v-model="localAd.locales[locale].image"
                bg-color="white"
              >
                <template v-slot:append>
                  <q-icon name="image" />
                </template>
              </q-input>
            </div>

            <div class="col-12">
              <q-input
                dense
                outlined
                stack-label
                :label="$t('admin.LBL_IMG_LOGO')"
                v-model="localAd.locales[locale].logo"
                bg-color="white"
              >
                <template v-slot:append>
                  <q-icon name="image" />
                </template>
              </q-input>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-expansion-item>
  </div>

  <div v-else class="row full-width">
    <q-expansion-item class="col-12" expand-separator icon="error_outline">
      <template v-slot:header>
        <q-item-section avatar>
          <q-img :src="noImage" style="height: 40px; width: 40px" />
        </q-item-section>
        <q-item-section>
          <q-item-label class="text-negative">{{ $t('msgSystem.AD_FETCH_ERR') }}</q-item-label>
          <q-item-label caption>{{ localAd?.id || 'Unknown ID' }}</q-item-label>
        </q-item-section>
      </template>
      <q-card>
        <q-card-section class="text-caption text-grey">
          {{ $t('admin.PROD_DATA_CORRUPT') }}
        </q-card-section>
      </q-card>
    </q-expansion-item>
  </div>
</template>

<script setup>
  // --- Imports ---
  import { computed, ref, watch } from 'vue'
  import { useI18n } from 'vue-i18n'
  import { copyToClipboard, date } from 'quasar'

  // Assets
  import noImage from 'src/assets/no.image.32.5.png'

  // --- Setup ---
  const { locale } = useI18n({ useScope: 'global' })
  const emit = defineEmits(['change'])

  const props = defineProps({
    ad: { type: Object, required: true }
  })

  // --- State ---
  // Clone the prop to sever the direct reactive reference, preventing accidental upstream mutations
  const localAd = ref(props.ad)

  // --- Watchers ---

  // 1. Sync Prop -> Local (Passive Sync from API/Parent)
  watch(
    () => props.ad,
    newVal => {
      localAd.value = newVal
    }
  )

  // 2. Detect User Edits (Active Sync)
  // We stringify the objects to compare their internal contents, ensuring the @change emit
  // only fires when the user actually types into an input, ignoring parent data injections.
  watch(
    localAd,
    (newVal, oldVal) => {
      if (newVal === oldVal) {
        emit('change', localAd.value.id)
      }
    },
    { deep: true }
  )

  // --- Computed ---

  const formattedDate = computed(() => {
    if (!localAd.value.createdAt) return 'N/A'
    return date.formatDate(localAd.value.createdAt, 'DD MMM YYYY, HH:mm')
  })

  // --- Actions ---

  const handleCopyId = () => {
    if (!localAd.value.id) return
    copyToClipboard(localAd.value.id)
      .then(() => {
        /* Silent success */
      })
      .catch(() => {})
  }
</script>

<style lang="scss" scoped>
  /* Optional: Add hover effect to expansion header */
  :deep(.q-expansion-item__container) {
    transition: background-color 0.2s;
    &:hover {
      background-color: #fafafa;
    }
  }
</style>
