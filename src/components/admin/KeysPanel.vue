<template>
  <div class="column full-height q-pa-sm relative-position">
    <div class="row q-mb-md q-pr-md">
      <q-chip
        dense
        outline
        square
        color="primary"
        text-color="white"
        class="col-12 text-overline no-border-radius"
        style="margin-left: 0px"
      >
        <div class="full-width text-center">
          {{ $t('admin.HEADER_KEYS_LIST', 'Seller Activation Keys') }}
        </div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
          <div class="col-auto">
            <q-input
              v-model.number="keysToGenerate"
              type="number"
              style="min-width: 110px"
              color="primary"
              outlined
              min="1"
              max="50"
              :label="$t('admin.LBL_KEYS_COUNT', 'Number of keys')"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>
          <div class="col-auto">
            <!-- Dugme za Standardne Ključeve (REDE) -->
            <q-btn
              size="sm"
              color="primary"
              outline
              icon="add_circle"
              :label="$t('admin.BTN_GENERATE', 'Generiši') + ' - REDE'"
              :loading="generating"
              unelevated
              @click="generateKeys(false)"
              class="full-height rounded-borders text-weight-bold"
            />
          </div>
          <div class="col-auto">
            <!-- Dugme za Poklon Ključeve za Štampu (GIFT) -->
            <q-btn
              size="sm"
              color="primary"
              icon="print"
              :label="$t('admin.BTN_GENERATE', 'Štampaj') + ' - GIFT'"
              :loading="generating"
              unelevated
              @click="generateKeys(true)"
              class="full-height rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md">
        <div class="fit">
          <q-table
            flat
            bordered
            class="sticky-header-table full-height"
            row-key="_id"
            :rows="keysList"
            :columns="columns"
            :loading="loading"
            :pagination="{ rowsPerPage: 15 }"
            :rows-per-page-options="[15, 30, 50]"
          >
            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip
                  dense
                  square
                  text-color="white"
                  :color="props.row.isUsed ? 'negative' : 'positive'"
                >
                  {{
                    props.row.isUsed
                      ? $t('admin.BADGE_USED', 'Used')
                      : $t('admin.BADGE_AVAILABLE', 'Available')
                  }}
                </q-chip>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" auto-width>
                <q-btn
                  flat
                  dense
                  round
                  :color="copiedKeyId === props.row._id ? 'positive' : 'primary'"
                  :icon="copiedKeyId === props.row._id ? 'check' : 'content_copy'"
                  @click="copyKey(props.row.key, props.row._id)"
                >
                  <q-tooltip>{{ $t('admin.TOOLTIP_COPY', 'Copy Key') }}</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </div>
      </q-scroll-area>
    </div>

    <q-inner-loading :showing="loading || generating">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>

    <!-- 🌟 VIDLJIVI DIJALOG ZA PREGLED I ŠTAMPU VIZIT KARTICA 🌟 -->
    <q-dialog v-model="printDialogOpen" full-width>
      <q-card class="bg-white" style="border-radius: 16px; min-height: 50vh" flat bordered>
        <!-- Zaglavlje -->
        <div
          class="row items-center justify-between q-pa-md bg-grey-2"
          data-html2canvas-ignore="true"
        >
          <div class="text-h6 text-primary text-capitalize text-weight-bold"></div>
          <div>
            <q-btn
              class="q-mr-sm"
              round
              color="dark"
              text-color="white"
              icon="print"
              size="sm"
              @click="exportToPDF"
              :loading="isGeneratingPdf"
            >
              <q-tooltip>{{ $t('admin.BTN_DOWNLOAD_PDF', 'Preuzmi PDF') }}</q-tooltip>
            </q-btn>
            <q-btn
              round
              flat
              color="grey-7"
              class="bg-grey-3"
              icon="close"
              size="sm"
              v-close-popup
            />
          </div>
        </div>

        <q-separator />

        <!-- Kontejner koji će html2pdf uslikati -->
        <div id="keys-print-card" class="q-pa-lg">
          <div class="print-page">
            <div
              v-for="keyObj in recentlyGeneratedKeys"
              :key="keyObj._id"
              class="biz-card column no-wrap justify-between"
            >
              <!-- Gornji deo: Ikona i Tekst -->
              <div class="col column items-center justify-center q-px-sm q-pt-sm">
                <div class="icon-circle bg-primary q-mb-sm">
                  <q-icon name="storefront" size="22px" color="white" />
                </div>
                <div class="text-h6 text-weight-bold text-capitalize" style="line-height: 1.1">
                  {{ $t('title.UPGRADE_TITLE', 'Postani Prodavac') }}
                </div>
                <div
                  class="text-center text-grey-7 q-mt-xs"
                  style="font-size: 8.5px; line-height: 1.2; padding: 0 10px"
                >
                  {{
                    $t(
                      'label.UPGRADE_DESC',
                      'Otključajte panel za prodavce i počnite da gradite prodavnicu iz snova već danas.'
                    )
                  }}
                </div>
              </div>

              <!-- Srednji deo: Ključ -->
              <div class="col-auto full-width q-px-lg q-py-xs">
                <div
                  class="key-display-box bg-blue-1 text-primary q-pa-xs rounded-borders text-center"
                >
                  <div
                    class="text-weight-bold text-uppercase"
                    style="font-size: 8px; margin-bottom: 2px"
                  >
                    {{ $t('label.UPGRADE_INPUT', 'Aktivacioni ključ') }}
                  </div>
                  <div
                    class="text-weight-bolder"
                    style="font-size: 13px; letter-spacing: 2px; font-family: monospace"
                  >
                    {{ keyObj.key }}
                  </div>
                </div>
              </div>

              <!-- Donji deo: Logo i Link -->
              <div class="col-auto row items-center justify-center text-primary q-pb-sm q-pt-xs">
                <img
                  v-if="companyLogo"
                  :src="companyLogo"
                  style="height: 12px; margin-right: 6px"
                  crossorigin="anonymous"
                  alt="Logo"
                />
                <q-icon v-else name="rocket_launch" size="12px" class="q-mr-xs" />
                <span
                  class="text-weight-bold text-uppercase"
                  style="font-size: 10px; letter-spacing: 1px"
                >
                  DIMENZN.COM
                </span>
              </div>
            </div>
          </div>
        </div>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useI18n } from 'vue-i18n'
  import api from 'src/utils/api'
  import { copyToClipboard } from 'quasar'
  import html2pdf from 'html2pdf.js'
  import { useUIStore } from 'src/stores/ui.store' // 🌟 ODKOMENTARISANO

  // --- Setup ---
  const { t } = useI18n({ useScope: 'global' })
  const uiStore = useUIStore() // 🌟 ODKOMENTARISANO

  // --- State ---
  const keysList = ref([])
  const loading = ref(false)
  const generating = ref(false)

  const printDialogOpen = ref(false)
  const isGeneratingPdf = ref(false)
  const recentlyGeneratedKeys = ref([])

  const keysToGenerate = ref(5)
  const copiedKeyId = ref(null)

  // 🌟 ODKOMENTARISANO: Reaktivan pristup logo-u iz UI Store-a
  const companyLogo = computed(() => uiStore.ui[0]?.urlImageCompanyLogo || '')

  // --- Computed Configurations ---
  const columns = computed(() => [
    {
      name: 'key',
      required: true,
      label: t('admin.TBL_KEY', 'Activation Key'),
      align: 'left',
      field: 'key',
      style: 'font-weight: bold; letter-spacing: 1px;'
    },
    {
      name: 'status',
      align: 'center',
      label: t('admin.TBL_STATUS', 'Status'),
      field: 'isUsed'
    },
    {
      name: 'createdAt',
      align: 'left',
      label: t('admin.TBL_CREATED', 'Generated On'),
      field: row => new Date(row.createdAt).toLocaleDateString()
    },
    {
      name: 'usedAt',
      align: 'left',
      label: t('admin.TBL_USED', 'Used On'),
      field: row => (row.usedAt ? new Date(row.usedAt).toLocaleDateString() : '-')
    },
    {
      name: 'actions',
      align: 'center',
      label: t('admin.TBL_ACTIONS', 'Copy'),
      field: 'actions'
    }
  ])

  // --- Actions ---
  const fetchKeys = async () => {
    loading.value = true
    try {
      const response = await api.get('/auth/admin/keys')
      keysList.value = response.data
    } catch (error) {
      console.error('Error fetching keys:', error)
    } finally {
      loading.value = false
    }
  }

  const generateKeys = async (isGift = false) => {
    if (keysToGenerate.value < 1) return

    generating.value = true
    recentlyGeneratedKeys.value = []

    try {
      const response = await api.post('/auth/admin/generate-keys', {
        count: keysToGenerate.value,
        isGift: isGift // 🌟 ŠALJEMO PARAMETAR BACKENDU
      })

      if (response.data && response.data.keys) {
        recentlyGeneratedKeys.value = response.data.keys
      }

      await fetchKeys()

      // 🌟 DIJALOG OTVARAMO SAMO AKO JE "GIFT" I IMA KLJUČEVA
      if (isGift && recentlyGeneratedKeys.value.length > 0) {
        printDialogOpen.value = true
      }
    } catch (error) {
      console.error('Error generating keys:', error)
    } finally {
      generating.value = false
    }
  }

  const exportToPDF = () => {
    isGeneratingPdf.value = true
    const element = document.getElementById('keys-print-card')

    const originalStyle = element.style.cssText
    element.style.height = 'auto'
    element.style.maxHeight = 'none'
    element.style.overflow = 'visible'

    const opt = {
      margin: 10,
      filename: `Aktivacioni_Kljucevi_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        onclone: clonedDoc => {
          const clonedElement = clonedDoc.getElementById('keys-print-card')
          if (clonedElement) {
            clonedElement.style.height = 'auto'
            clonedElement.style.maxHeight = 'none'
            clonedElement.style.overflow = 'visible'
          }
        }
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }

    html2pdf()
      .set(opt)
      .from(element)
      .save()
      .then(() => {
        element.style.cssText = originalStyle
        isGeneratingPdf.value = false
      })
      .catch(error => {
        console.error('PDF Generation Failed:', error)
        element.style.cssText = originalStyle
        isGeneratingPdf.value = false
      })
  }

  const copyKey = async (keyString, id) => {
    try {
      await copyToClipboard(keyString)
      copiedKeyId.value = id

      setTimeout(() => {
        if (copiedKeyId.value === id) {
          copiedKeyId.value = null
        }
      }, 2000)
    } catch (err) {
      console.error('Failed to copy key:', err)
    }
  }

  onMounted(() => {
    fetchKeys()
  })
</script>

<style lang="scss" scoped>
  /* -------------------------------------------
     POSTOJEĆI CSS ZA TABELU
  -------------------------------------------- */
  .sticky-header-table {
    height: 100%;

    :deep(.q-table__top),
    :deep(.q-table__bottom),
    :deep(thead tr:first-child th) {
      background-color: #fff;
    }

    :deep(thead tr th) {
      position: sticky;
      z-index: 1;
    }

    :deep(thead tr:first-child th) {
      top: 0;
    }

    :deep(.q-table--loading thead tr:last-child th) {
      top: 48px;
    }

    :deep(tbody) {
      scroll-margin-top: 48px;
    }
  }

  /* -------------------------------------------
     CSS LOGIKA ZA VIZIT KARTICE (Vidljive u dijalogu i PDF-u)
  -------------------------------------------- */
  .print-page {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-content: flex-start;
    gap: 15mm;
    width: 190mm;
    margin: 0 auto;
  }

  .biz-card {
    width: 85mm;
    height: 55mm;
    border: 1px dashed #ccc;
    border-radius: 8px;
    overflow: hidden;
    box-sizing: border-box;
    background-color: white;
  }

  .icon-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .key-display-box {
    border: 1px dashed $primary;
  }
</style>
