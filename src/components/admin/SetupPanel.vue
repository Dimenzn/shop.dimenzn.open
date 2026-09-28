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
        <div class="full-width text-center">{{ $t('admin.HEADER_UI_STATE') }}</div>
      </q-chip>
      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              color="primary"
              unelevated
              outline
              icon="refresh"
              :label="$t('admin.BTN_REFRESH')"
              @click="fetchData()"
              class="full-width full-height bg-white rounded-borders text-weight-bold"
            />
          </div>

          <div class="col-xs-6 col-sm-auto">
            <q-btn
              size="sm"
              :color="hasChanges ? 'positive' : 'grey-4'"
              :text-color="hasChanges ? 'white' : 'grey-6'"
              :disable="!hasChanges"
              unelevated
              icon="save"
              :label="$t('admin.BTN_SAVE')"
              @click="saveLocal"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md" :content-style="{ width: '100%' }">
        <div v-if="targetUI" class="q-pb-xl">
          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_BASIC') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.companyName"
                  :label="$t('admin.SET_COMPANY_NAME')"
                >
                  <template v-slot:prepend><q-icon name="business" /></template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.urlImageCompanyLogo"
                  :label="$t('admin.SET_LOGO')"
                >
                  <template v-slot:prepend><q-icon name="image" /></template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-select
                  outlined
                  dense
                  bg-color="white"
                  popup-content-style="width: 300px; height:300px"
                  use-input
                  input-debounce="0"
                  v-model="targetUI.currency"
                  :label="$t('admin.SET_CURRENCY')"
                  :options="filteredOptions"
                  @filter="filterFn"
                  emit-value
                  map-options
                  fill-input
                  hide-selected
                >
                  <template v-slot:prepend><q-icon name="payments" /></template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ $t('label.SEARCH_EMPTY') }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="col-12 col-sm-6">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.leftDrawerOpen }">
                        {{ $t('admin.UI_LEFT_DRAWER') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.leftDrawerOpen" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>

              <div class="col-12 col-sm-6">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.langBar }">
                        {{ $t('admin.UI_LANG_BAR') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.langBar" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>

              <div class="col-12 col-sm-6" v-if="targetUI">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.showInfoPage }">
                        {{ $t('admin.UI_SHOW_INFO', 'Show Info Page Button') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.showInfoPage" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_PAYMENTS') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.paymentCod }">
                        {{ $t('admin.UI_PAYMENT_COD') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.paymentCod" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>

              <div class="col-12 col-md-4">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.paymentCia }">
                        {{ $t('admin.UI_PAYMENT_CIA') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.paymentCia" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>

              <div class="col-12 col-md-4">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.paymentPoa }">
                        {{ $t('admin.UI_PAYMENT_POA') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.paymentPoa" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_PLATFORM_FEE', 'Platform Service Fee') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-4">
                <q-select
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.platformFeeType"
                  :options="[
                    {
                      label: $t('admin.LBL_FEE_PERCENTAGE', 'Percentage (%)'),
                      value: 'percentage'
                    },
                    { label: $t('admin.LBL_FEE_FLAT', 'Flat Rate'), value: 'flat' }
                  ]"
                  emit-value
                  map-options
                  :label="$t('admin.SET_FEE_TYPE', 'Fee Strategy')"
                >
                  <template v-slot:prepend><q-icon name="account_balance_wallet" /></template>
                </q-select>
              </div>

              <div class="col-12 col-md-8" v-if="targetUI.platformFeeType === 'percentage'">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.platformFeePercentage"
                  :label="$t('admin.SET_FEE_PERCENTAGE', 'Fee Percentage (%)')"
                  type="number"
                  min="0"
                  max="100"
                >
                  <template v-slot:prepend><q-icon name="percent" /></template>
                  <template v-slot:append>
                    <q-icon name="info" color="grey-5" class="cursor-pointer">
                      <q-tooltip class="bg-dark text-body2">
                        {{
                          $t(
                            'admin.TOOLTIP_FEE_PERCENTAGE',
                            'Calculated based on the total cart value.'
                          )
                        }}
                      </q-tooltip>
                    </q-icon>
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-8" v-if="targetUI.platformFeeType === 'flat'">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.platformFeeFlat"
                  :label="$t('admin.SET_FEE_FLAT', 'Flat Fee Amount')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="attach_money" /></template>
                  <template v-slot:append>
                    <span class="text-caption text-grey-8 q-mr-sm">{{ targetUI.currency }}</span>
                    <q-icon name="info" color="grey-5" class="cursor-pointer">
                      <q-tooltip class="bg-dark text-body2">
                        {{
                          $t(
                            'admin.TOOLTIP_FEE_FLAT',
                            'Applied once per seller package in the cart.'
                          )
                        }}
                      </q-tooltip>
                    </q-icon>
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs q-mt-lg">
              {{ $t('admin.LBL_AUTO_BILLING', 'Automated Monthly Billing') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md items-center">
              <div class="col-12">
                <q-select
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.platformTimezone"
                  :options="timezoneOptions"
                  @filter="filterTimezones"
                  use-input
                  input-debounce="0"
                  behavior="menu"
                  emit-value
                  map-options
                  :label="$t('admin.SET_TIMEZONE', 'Platform Timezone')"
                >
                  <template v-slot:prepend><q-icon name="schedule" /></template>

                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ $t('label.SEARCH_EMPTY', 'No matching timezone found') }}
                      </q-item-section>
                    </q-item>
                  </template>

                  <template v-slot:append>
                    <q-icon name="info" color="grey-5" class="cursor-pointer">
                      <q-tooltip class="bg-dark text-body2">
                        {{
                          $t(
                            'admin.TOOLTIP_TIMEZONE',
                            'Used to calculate "Midnight" for automated billing and daily resets.'
                          )
                        }}
                      </q-tooltip>
                    </q-icon>
                  </template>
                </q-select>
              </div>

              <div class="col-12 col-md-4">
                <q-toggle
                  :class="{ 'text-grey-6': !targetUI.autoBillingEnabled }"
                  v-model="targetUI.autoBillingEnabled"
                  color="green"
                  keep-color
                  icon="smart_toy"
                  :label="$t('admin.SET_AUTO_BILLING', 'Enable Auto-Charge')"
                />
              </div>

              <div class="col-12 col-md-8" v-if="targetUI.autoBillingEnabled">
                <q-select
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.autoBillingDay"
                  :options="billingDayOptions"
                  emit-value
                  map-options
                  :label="$t('admin.SET_BILLING_DAY', 'Billing Day of the Month')"
                >
                  <template v-slot:prepend><q-icon name="event" color="primary" /></template>
                  <template v-slot:append>
                    <q-icon name="info" color="grey-5" class="cursor-pointer">
                      <q-tooltip class="bg-dark text-body2">
                        {{
                          $t(
                            'admin.TOOLTIP_BILLING_DAY',
                            'The system will automatically charge all active sellers at midnight on this day.'
                          )
                        }}
                      </q-tooltip>
                    </q-icon>
                  </template>
                </q-select>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs q-mt-lg">
              {{ $t('admin.LBL_TRUST_ENGINE', 'Trust Score Engine & SLAs') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.slaConfirmHours"
                  :label="$t('admin.SET_SLA_CONFIRM', 'Time to Confirm')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="timer" /></template>
                  <template v-slot:append
                    ><span class="text-caption text-grey-8">{{
                      $t('label.HOURS', 'Hours')
                    }}</span></template
                  >
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.slaShipHours"
                  :label="$t('admin.SET_SLA_SHIP', 'Time to Ship')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="local_shipping" /></template>
                  <template v-slot:append
                    ><span class="text-caption text-grey-8">{{
                      $t('label.HOURS', 'Hours')
                    }}</span></template
                  >
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.stagnantDays"
                  :label="$t('admin.SET_STAGNANT_DAYS', 'Stagnant Threshold')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="event_busy" /></template>
                  <template v-slot:append
                    ><span class="text-caption text-grey-8">{{
                      $t('label.DAYS', 'Days')
                    }}</span></template
                  >
                </q-input>
              </div>

              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.scoreConfirmBonus"
                  :label="$t('admin.SET_SCORE_CONFIRM', 'Confirm Bonus')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="trending_up" color="positive" /></template>
                  <template v-slot:append
                    ><span class="text-caption text-positive">+SR</span></template
                  >
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.scoreShipBonus"
                  :label="$t('admin.SET_SCORE_SHIP', 'Ship Bonus')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="trending_up" color="positive" /></template>
                  <template v-slot:append
                    ><span class="text-caption text-positive">+SR</span></template
                  >
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.scoreDeliveryBase"
                  :label="$t('admin.SET_SCORE_DELIVERY', 'Delivery Base')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend
                    ><q-icon name="workspace_premium" color="primary"
                  /></template>
                  <template v-slot:append
                    ><span class="text-caption text-primary">+SR</span></template
                  >
                </q-input>
              </div>

              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.scoreCancelPenalty"
                  :label="$t('admin.SET_SCORE_CANCEL', 'Cancel Penalty')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="gavel" color="negative" /></template>
                  <template v-slot:append
                    ><span class="text-caption text-negative">-SR</span></template
                  >
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.scoreRestockPenalty"
                  :label="$t('admin.SET_SCORE_RESTOCK', 'Return Penalty')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend
                    ><q-icon name="assignment_return" color="orange-9"
                  /></template>
                  <template v-slot:append
                    ><span class="text-caption text-orange-9">-SR</span></template
                  >
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.stagnantPenalty"
                  :label="$t('admin.SET_SCORE_STAGNANT', 'Stagnant Penalty')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="bloodtype" color="negative" /></template>
                  <template v-slot:append
                    ><span class="text-caption text-negative">-SR</span></template
                  >
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_CLOUD_STORAGE', 'Cloud Storage Management') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md items-center">
              <div class="col-12 col-md-6">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.autoCloudCleanup }">
                        {{ $t('admin.SET_AUTO_CLEANUP', 'Auto-Cleanup Orphaned Images') }}
                      </q-item-label>
                      <q-item-label caption>
                        {{
                          $t(
                            'admin.DESC_AUTO_CLEANUP',
                            'Runs nightly at 3:00 AM to delete unused files older than 24 hours.'
                          )
                        }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.autoCloudCleanup" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-btn
                  color="negative"
                  outline
                  icon="cleaning_services"
                  :label="$t('admin.BTN_MANUAL_CLEANUP', 'Run Manual Cleanup Now')"
                  class="full-width full-height q-pa-sm"
                  @click="runManualCleanup"
                  :loading="isCleaning"
                >
                  <q-tooltip class="bg-dark text-body2">
                    {{
                      $t(
                        'admin.TOOLTIP_MANUAL_CLEANUP',
                        'Scans database vs Cloudinary and deletes unlinked files.'
                      )
                    }}
                  </q-tooltip>
                </q-btn>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_SHIPPING') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model.number="targetUI.shippingCost"
                  :label="$t('admin.SET_SHIPPING', 'Platform Default Shipping')"
                  type="number"
                  min="0"
                >
                  <template v-slot:prepend><q-icon name="local_shipping" /></template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-card flat bordered class="bg-grey-1" style="overflow: hidden">
                  <q-item tag="label" v-ripple>
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !targetUI.showCountry }">
                        {{ $t('admin.UI_SHIPPING_MODE') }}
                      </q-item-label>
                      <q-item-label caption :class="{ 'text-grey-6': !targetUI.showCountry }">
                        {{ $t('admin.HINT_SHIPPING_MODE') }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="targetUI.showCountry" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-select
                  outlined
                  dense
                  bg-color="white"
                  popup-content-style="width: 300px; height:300px"
                  v-model="targetUI.defaultCountry"
                  :label="$t('admin.SET_DEFAULT_COUNTRY')"
                  :options="filteredCountries"
                  @filter="filterCountries"
                  use-input
                  input-debounce="0"
                  behavior="menu"
                >
                  <template v-slot:prepend><q-icon name="flag" /></template>
                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ $t('label.SEARCH_EMPTY') }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>

              <div class="col-12" v-if="targetUI.showCountry">
                <q-select
                  outlined
                  dense
                  bg-color="white"
                  popup-content-style="width: 300px; height:300px"
                  v-model="targetUI.allowedCountries"
                  multiple
                  use-chips
                  stack-label
                  :label="$t('admin.SET_ALLOWED_COUNTRY')"
                  :options="filteredCountries"
                  @filter="filterCountries"
                  use-input
                  input-debounce="0"
                >
                  <template v-slot:prepend><q-icon name="public" /></template>

                  <template v-slot:selected-item="scope">
                    <q-chip
                      :removable="scope.opt !== targetUI.defaultCountry"
                      @remove="scope.removeAtIndex(scope.index)"
                      :tabindex="scope.tabindex"
                      color="primary"
                      text-color="white"
                      dense
                      square
                      class="q-ma-xs"
                    >
                      {{ scope.opt }}
                      <q-icon
                        v-if="scope.opt === targetUI.defaultCountry"
                        name="lock"
                        size="14px"
                        class="q-ml-xs"
                      />
                    </q-chip>
                  </template>

                  <template v-slot:no-option>
                    <q-item>
                      <q-item-section class="text-grey">
                        {{ $t('label.SEARCH_EMPTY') }}
                      </q-item-section>
                    </q-item>
                  </template>
                </q-select>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_SOCIAL_LINKS', 'Social & Contact') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6" v-if="targetUI.email">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.email.url"
                  :label="$t('admin.SET_EMAIL_ADDRESS', 'Support Email Address')"
                  :readonly="!targetUI.email.show"
                >
                  <template v-slot:prepend><q-icon name="mail" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="targetUI.email.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6" v-if="targetUI.whatsapp">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.whatsapp.url"
                  :label="$t('admin.SET_WHATSAPP_URL', 'WhatsApp URL or Number')"
                  :readonly="!targetUI.whatsapp.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-whatsapp" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="targetUI.whatsapp.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6" v-if="targetUI.x">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.x.url"
                  :label="$t('admin.SET_X_URL', 'X (Twitter) URL')"
                  :readonly="!targetUI.x.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-x-twitter" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="targetUI.x.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6" v-if="targetUI.instagram">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.instagram.url"
                  :label="$t('admin.SET_INSTAGRAM_URL', 'Instagram URL')"
                  :readonly="!targetUI.instagram.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-instagram" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="targetUI.instagram.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6" v-if="targetUI.facebook">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.facebook.url"
                  :label="$t('admin.SET_FACEBOOK_URL', 'Facebook URL')"
                  :readonly="!targetUI.facebook.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-facebook" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="targetUI.facebook.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6" v-if="targetUI.tiktok">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.tiktok.url"
                  :label="$t('admin.SET_TIKTOK_URL', 'TikTok URL')"
                  :readonly="!targetUI.tiktok.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-tiktok" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="targetUI.tiktok.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6" v-if="targetUI.youtube">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="targetUI.youtube.url"
                  :label="$t('admin.SET_YOUTUBE_URL', 'YouTube URL')"
                  :readonly="!targetUI.youtube.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-youtube" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="targetUI.youtube.show" color="primary" dense />
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-caption text-primary q-mb-xs">*{{ $t('admin.LBL_ENV_INSTRUCT') }}</div>
            <div class="text-overline text-primary q-mb-xs">{{ $t('admin.LBL_ENV_SMTP') }}*</div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableSmtpHost ? 'white' : 'grey-2'"
                  v-model="smtpHost"
                  :label="$t('admin.SMTP_HOST')"
                  :readonly="!enableSmtpHost"
                >
                  <template v-slot:prepend><q-icon name="mail" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableSmtpHost" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableSmtpPort ? 'white' : 'grey-2'"
                  v-model="smtpPort"
                  :label="$t('admin.SMTP_PORT')"
                  :readonly="!enableSmtpPort"
                >
                  <template v-slot:prepend><q-icon name="mail" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableSmtpPort" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableSmtpUser ? 'white' : 'grey-2'"
                  v-model="smtpUser"
                  :label="$t('admin.SMTP_USER')"
                  :readonly="!enableSmtpUser"
                >
                  <template v-slot:prepend><q-icon name="mail" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableSmtpUser" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableSmtpPass ? 'white' : 'grey-2'"
                  v-model="smtpPass"
                  :label="$t('admin.SMTP_PASS')"
                  :readonly="!enableSmtpPass"
                >
                  <template v-slot:prepend><q-icon name="mail" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableSmtpPass" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableSmtpSecure ? 'white' : 'grey-2'"
                  v-model="smtpSecure"
                  :label="$t('admin.SMTP_SECURE')"
                  :readonly="!enableSmtpSecure"
                >
                  <template v-slot:prepend><q-icon name="mail" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableSmtpSecure" color="primary" dense />
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">{{ $t('admin.LBL_ENV_DB') }}*</div>
            <q-separator class="q-mb-sm" />
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  outlined
                  dense
                  :bg-color="enableMongodbUri ? 'white' : 'grey-2'"
                  v-model="mongodbUri"
                  :label="$t('admin.ENV_MONGODB_URI')"
                  :readonly="!enableMongodbUri"
                >
                  <template v-slot:prepend><q-icon name="storage" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableMongodbUri" color="primary" dense />
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">{{ $t('admin.LBL_ENV_JWT') }}*</div>
            <q-separator class="q-mb-sm" />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableJwtAccess ? 'white' : 'grey-2'"
                  v-model="jwtAccessSecret"
                  :label="$t('admin.ENV_JWT_ACCESS')"
                  :readonly="!enableJwtAccess"
                >
                  <template v-slot:prepend><q-icon name="key" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableJwtAccess" color="primary" dense />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableJwtRefresh ? 'white' : 'grey-2'"
                  v-model="jwtRefreshSecret"
                  :label="$t('admin.ENV_JWT_REFRESH')"
                  :readonly="!enableJwtRefresh"
                >
                  <template v-slot:prepend><q-icon name="vpn_key" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableJwtRefresh" color="primary" dense />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableAccessExpires ? 'white' : 'grey-2'"
                  v-model="accessTokenExpiresIn"
                  :label="$t('admin.ENV_ACCESS_EXPIRES')"
                  :readonly="!enableAccessExpires"
                >
                  <template v-slot:prepend><q-icon name="timer" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableAccessExpires" color="primary" dense />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableRefreshExpires ? 'white' : 'grey-2'"
                  v-model="refreshTokenExpiresIn"
                  :label="$t('admin.ENV_REFRESH_EXPIRES')"
                  :readonly="!enableRefreshExpires"
                >
                  <template v-slot:prepend><q-icon name="update" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableRefreshExpires" color="primary" dense />
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_ENV_STRIPE', 'Stripe Keys') }}*
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableStripePublic ? 'white' : 'grey-2'"
                  v-model="stripePublicKey"
                  :label="$t('admin.ENV_STRIPE_PUBLIC', 'Stripe Public Key')"
                  :readonly="!enableStripePublic"
                >
                  <template v-slot:prepend><q-icon name="credit_card" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableStripePublic" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableStripeSecret ? 'white' : 'grey-2'"
                  v-model="stripeSecretKey"
                  :label="$t('admin.ENV_STRIPE_SECRET', 'Stripe Secret Key')"
                  :readonly="!enableStripeSecret"
                  type="password"
                >
                  <template v-slot:prepend><q-icon name="vpn_key" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableStripeSecret" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableStripeWebhook ? 'white' : 'grey-2'"
                  v-model="stripeWebhookSecret"
                  :label="$t('admin.ENV_STRIPE_WEBHOOK', 'Stripe Webhook Secret')"
                  :readonly="!enableStripeWebhook"
                  type="password"
                >
                  <template v-slot:prepend><q-icon name="webhook" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableStripeWebhook" color="primary" dense />
                  </template>
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">{{ $t('admin.LBL_ENV_SYS') }}*</div>
            <q-separator class="q-mb-sm" />
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableDevApi ? 'white' : 'grey-2'"
                  v-model="devModeApi"
                  :label="$t('admin.ENV_DEV_API')"
                  :readonly="!enableDevApi"
                >
                  <template v-slot:prepend><q-icon name="api" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableDevApi" color="primary" dense />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  :bg-color="enableDevEmail ? 'white' : 'grey-2'"
                  v-model="devModeEmailRedirect"
                  :label="$t('admin.ENV_DEV_EMAIL')"
                  :readonly="!enableDevEmail"
                >
                  <template v-slot:prepend><q-icon name="link" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="enableDevEmail" color="primary" dense />
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </div>

        <div
          v-else
          class="column items-center justify-center text-grey-6 q-pa-xl"
          style="min-height: 40vh"
        >
          <q-icon name="settings" size="4em" class="q-mb-md text-grey-4" />
          <div class="text-h6">{{ $t('msgSystem.NO_DATA') }}</div>
        </div>
      </q-scroll-area>
    </div>

    <q-inner-loading :showing="isLoading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup>
  // --- Imports ---
  import { computed, ref, watch, onMounted } from 'vue'
  import { useAdminStore } from 'src/stores/admin.store'
  import allCountries from 'src/utils/countries'

  import api from 'src/utils/api'
  import { useNotifyStore } from 'src/stores/notify.store'
  import { useI18n } from 'vue-i18n' // 🌟 Ensure this is imported at the top!

  // Initialize i18n for the script
  const { t } = useI18n({ useScope: 'global' })

  const notifyStore = useNotifyStore()
  const isCleaning = ref(false)

  // --- Actions: Cloud Cleanup ---
  const runManualCleanup = async () => {
    isCleaning.value = true
    try {
      // Calls the secure admin route
      const response = await api.post('auth/admin/cloudinary/cleanup')

      if (response.data.success) {
        // 🌟 REFACTORED: Passing the dynamic count variable into the translation
        notifyStore.notify(
          200,
          t('msgSystem.CLEANUP_SUCCESS', 'Cleanup Complete! Removed {count} orphaned images.', {
            count: response.data.deletedCount
          })
        )
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
      // 🌟 REFACTORED HARD-CODED TEXT
      notifyStore.notify(
        500,
        t('msgSystem.CLEANUP_FAILED', 'Failed to run cleanup. Check server logs.')
      )
    } finally {
      isCleaning.value = false
    }
  }

  // --- Setup ---
  const adminStore = useAdminStore()
  const isLoading = ref(false)

  // Maps for Country & Currency Dropdowns
  const countryOptions = ref(allCountries)
  const filteredCountries = ref(allCountries)
  const filteredOptions = ref([])

  // --- ENV State (Values) ---
  const smtpHost = ref(null)
  const smtpPort = ref(null)
  const smtpUser = ref(null)
  const smtpPass = ref(null)
  const smtpSecure = ref(null)

  const mongodbUri = ref(null)
  const jwtAccessSecret = ref(null)
  const jwtRefreshSecret = ref(null)
  const accessTokenExpiresIn = ref(null)
  const refreshTokenExpiresIn = ref(null)
  const devModeApi = ref(null)
  const devModeEmailRedirect = ref(null)

  const stripePublicKey = ref(null)
  const stripeSecretKey = ref(null)
  const stripeWebhookSecret = ref(null)

  // --- ENV State (Toggles) ---
  const enableSmtpHost = ref(false)
  const enableSmtpPort = ref(false)
  const enableSmtpUser = ref(false)
  const enableSmtpPass = ref(false)
  const enableSmtpSecure = ref(false)

  const enableMongodbUri = ref(false)
  const enableJwtAccess = ref(false)
  const enableJwtRefresh = ref(false)
  const enableAccessExpires = ref(false)
  const enableRefreshExpires = ref(false)
  const enableDevApi = ref(false)
  const enableDevEmail = ref(false)

  const enableStripePublic = ref(false)
  const enableStripeSecret = ref(false)
  const enableStripeWebhook = ref(false)

  // --- Computed State ---

  /**
   * Safely maps the UI data from the admin store. Accounts for potential array wrapping.
   */
  const targetUI = computed(() => {
    const data = adminStore.adminData?.ui
    if (!data) return null
    return Array.isArray(data) ? data[0] : data
  })

  /**
   * Checks if there are unsaved UI changes in the store to enable the Save button.
   */
  const hasChanges = computed(() => adminStore.modifiedUI)

  const fetchData = async () => {
    isLoading.value = true
    try {
      await adminStore.fetchData()
    } catch (error) {
      console.error('Failed to load setup data:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Lifecycle ---
  onMounted(async () => {
    fetchData()
  })

  // --- Watchers ---

  // 1. Initialize Currency Options when UI data loads
  watch(
    targetUI,
    newVal => {
      if (newVal?.currencyOptions) {
        filteredOptions.value = newVal.currencyOptions
      }
    },
    { immediate: true, deep: true }
  )

  // 2. Data Integrity: Auto-add default country to the allowed countries list
  watch(
    () => [targetUI.value?.defaultCountry, targetUI.value?.showCountry],
    () => {
      if (targetUI.value?.showCountry && targetUI.value?.defaultCountry) {
        if (!targetUI.value.allowedCountries.includes(targetUI.value.defaultCountry)) {
          targetUI.value.allowedCountries.push(targetUI.value.defaultCountry)
          targetUI.value.allowedCountries.sort()
        }
      }
    },
    { deep: true }
  )

  // 3. UI Config Dirty State Watcher
  watch(
    targetUI,
    (newVal, oldVal) => {
      if (newVal && oldVal && newVal === oldVal && !isLoading.value) {
        if (typeof adminStore.markUIAsModified === 'function') {
          adminStore.markUIAsModified()
        }
      }
    },
    { deep: true }
  )

  // 4. ENV Config Dirty State Watcher
  watch(
    [
      enableSmtpHost,
      enableSmtpPort,
      enableSmtpUser,
      enableSmtpPass,
      enableSmtpSecure,
      enableMongodbUri,
      enableJwtAccess,
      enableJwtRefresh,
      enableAccessExpires,
      enableRefreshExpires,
      enableDevApi,
      enableDevEmail,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpSecure,
      mongodbUri,
      jwtAccessSecret,
      jwtRefreshSecret,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
      devModeApi,
      devModeEmailRedirect,
      enableStripePublic,
      enableStripeSecret,
      enableStripeWebhook,
      stripePublicKey,
      stripeSecretKey,
      stripeWebhookSecret
    ],
    () => {
      if (!isLoading.value && typeof adminStore.markUIAsModified === 'function') {
        adminStore.markUIAsModified()
      }
    }
  )

  // --- Actions ---

  /**
   * Compiles enabled ENV values and UI configurations to save to the backend.
   */
  const saveLocal = async () => {
    if (!hasChanges.value) return
    isLoading.value = true

    const envPayload = {}

    // SMTP Mapping
    if (enableSmtpHost.value) envPayload.SMTP_HOST = smtpHost.value
    if (enableSmtpPort.value) envPayload.SMTP_PORT = smtpPort.value
    if (enableSmtpUser.value) envPayload.SMTP_USER = smtpUser.value
    if (enableSmtpPass.value) envPayload.SMTP_PASS = smtpPass.value
    if (enableSmtpSecure.value) envPayload.SMTP_SECURE = smtpSecure.value

    // DB & JWT Mapping
    if (enableMongodbUri.value) envPayload.MONGODB_URI = mongodbUri.value
    if (enableJwtAccess.value) envPayload.JWT_ACCESS_SECRET = jwtAccessSecret.value
    if (enableJwtRefresh.value) envPayload.JWT_REFRESH_SECRET = jwtRefreshSecret.value
    if (enableAccessExpires.value) envPayload.ACCESS_TOKEN_EXPIRES_IN = accessTokenExpiresIn.value
    if (enableRefreshExpires.value)
      envPayload.REFRESH_TOKEN_EXPIRES_IN = refreshTokenExpiresIn.value

    // System API Mapping
    if (enableDevApi.value) envPayload.BASE_URL_API = devModeApi.value
    if (enableDevEmail.value) envPayload.BASE_URL_EMAIL_REDIRECT = devModeEmailRedirect.value

    // Stripe Mapping
    if (enableStripePublic.value) envPayload.STRIPE_PUBLIC_KEY = stripePublicKey.value
    if (enableStripeSecret.value) envPayload.STRIPE_SECRET_KEY = stripeSecretKey.value
    if (enableStripeWebhook.value) envPayload.STRIPE_WEBHOOK_SECRET = stripeWebhookSecret.value

    try {
      await adminStore.saveData(Object.keys(envPayload).length > 0 ? envPayload : null)

      enableSmtpHost.value = false
      enableSmtpPort.value = false
      enableSmtpUser.value = false
      enableSmtpPass.value = false
      enableSmtpSecure.value = false
      enableMongodbUri.value = false
      enableJwtAccess.value = false
      enableJwtRefresh.value = false
      enableAccessExpires.value = false
      enableRefreshExpires.value = false
      enableDevApi.value = false
      enableDevEmail.value = false
      enableStripePublic.value = false
      enableStripeSecret.value = false
      enableStripeWebhook.value = false

      if (typeof adminStore.clearUIFlags === 'function') {
        adminStore.clearUIFlags()
      }
    } catch (error) {
      console.error('Failed to save configuration:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Quasar Select Filters ---

  function filterCountries(val, update) {
    update(() => {
      if (val === '') {
        filteredCountries.value = countryOptions.value
      } else {
        const needle = val.toLowerCase()
        filteredCountries.value = countryOptions.value.filter(
          v => v.toLowerCase().indexOf(needle) > -1
        )
      }
    })
  }

  function filterFn(val, update) {
    if (!targetUI.value?.currencyOptions) return

    update(() => {
      if (val === '') {
        filteredOptions.value = targetUI.value.currencyOptions
      } else {
        const needle = val.toLowerCase()
        filteredOptions.value = targetUI.value.currencyOptions.filter(
          v => v.label.toLowerCase().indexOf(needle) > -1
        )
      }
    })
  }

  // --- Helpers ---

  // Generates an array of objects: [{ label: "1st", value: 1 }, { label: "2nd", value: 2 } ... up to 28]
  const billingDayOptions = Array.from({ length: 28 }, (_, i) => {
    const day = i + 1
    let suffix = 'th'
    if (day === 1 || day === 21) suffix = 'st'
    else if (day === 2 || day === 22) suffix = 'nd'
    else if (day === 3 || day === 23) suffix = 'rd'

    return { label: `${day}${suffix} of the month`, value: day }
  })

  // 🌟 A curated list of major global timezones, organized by UTC offset
  const allTimezones = [
    { label: '(UTC-11:00) Pacific/Midway', value: 'Pacific/Midway' },
    { label: '(UTC-10:00) Pacific/Honolulu', value: 'Pacific/Honolulu' },
    { label: '(UTC-09:00) America/Anchorage', value: 'America/Anchorage' },
    { label: '(UTC-08:00) America/Los_Angeles', value: 'America/Los_Angeles' },
    { label: '(UTC-07:00) America/Denver', value: 'America/Denver' },
    { label: '(UTC-06:00) America/Chicago', value: 'America/Chicago' },
    { label: '(UTC-05:00) America/New_York', value: 'America/New_York' },
    { label: '(UTC-04:00) America/Caracas', value: 'America/Caracas' },
    { label: '(UTC-03:00) America/Buenos_Aires', value: 'America/Argentina/Buenos_Aires' },
    { label: '(UTC-02:00) Atlantic/South_Georgia', value: 'Atlantic/South_Georgia' },
    { label: '(UTC-01:00) Atlantic/Azores', value: 'Atlantic/Azores' },
    { label: '(UTC+00:00) UTC / London', value: 'UTC' },
    { label: '(UTC+01:00) Europe/Belgrade', value: 'Europe/Belgrade' },
    { label: '(UTC+02:00) Europe/Athens', value: 'Europe/Athens' },
    { label: '(UTC+03:00) Europe/Moscow', value: 'Europe/Moscow' },
    { label: '(UTC+04:00) Asia/Dubai', value: 'Asia/Dubai' },
    { label: '(UTC+05:00) Asia/Karachi', value: 'Asia/Karachi' },
    { label: '(UTC+05:30) Asia/Kolkata', value: 'Asia/Kolkata' },
    { label: '(UTC+06:00) Asia/Dhaka', value: 'Asia/Dhaka' },
    { label: '(UTC+07:00) Asia/Bangkok', value: 'Asia/Bangkok' },
    { label: '(UTC+08:00) Asia/Singapore', value: 'Asia/Singapore' },
    { label: '(UTC+09:00) Asia/Tokyo', value: 'Asia/Tokyo' },
    { label: '(UTC+10:00) Australia/Sydney', value: 'Australia/Sydney' },
    { label: '(UTC+11:00) Pacific/Noumea', value: 'Pacific/Noumea' },
    { label: '(UTC+12:00) Pacific/Auckland', value: 'Pacific/Auckland' }
  ]

  const timezoneOptions = ref(allTimezones)

  const filterTimezones = (val, update) => {
    if (val === '') {
      update(() => {
        timezoneOptions.value = allTimezones
      })
      return
    }
    update(() => {
      const needle = val.toLowerCase()
      // Filters based on the friendly label so they can search "UTC+1" or "Belgrade"
      timezoneOptions.value = allTimezones.filter(v => v.label.toLowerCase().indexOf(needle) > -1)
    })
  }
</script>
