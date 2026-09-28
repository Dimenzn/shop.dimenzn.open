<template>
  <div class="column full-height q-pa-sm relative-position">
    <div class="row q-mb-md q-pr-md justify-between items-center">
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
          {{ $t('seller.HEADER_STORE_SETUP', 'Store Profile Setup') }}
        </div>
      </q-chip>

      <div class="col-12 q-pb-sm">
        <q-separator color="primary" />
      </div>
      <div class="col-12">
        <div class="row items-stretch justify-end q-col-gutter-xs">
          <div class="col-xs-12 col-sm-auto">
            <q-btn
              size="sm"
              :color="hasChanges ? 'positive' : 'grey-4'"
              :text-color="hasChanges ? 'white' : 'grey-6'"
              :disable="!hasChanges"
              unelevated
              icon="save"
              :label="$t('admin.BTN_SAVE')"
              @click="saveProfile"
              class="full-width full-height rounded-borders text-weight-bold"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="col" style="min-height: 0">
      <q-scroll-area ref="scrollArea" class="fit q-pr-md" :content-style="{ width: '100%' }">
        <div class="q-pb-xl">
          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('seller.LBL_BASIC_INFO', 'Basic Store Information') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.storeName"
                  :label="$t('seller.SET_STORE_NAME', 'Store Name')"
                >
                  <template v-slot:prepend><q-icon name="storefront" /></template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-file
                  v-model="selectedLogo"
                  outlined
                  dense
                  bg-color="white"
                  :label="$t('seller.SET_STORE_LOGO', 'Store Logo') + ' ( 1 : 1 )'"
                  accept=".jpg, .jpeg, .png, .webp, image/*"
                  @update:model-value="file => uploadImage(file, 'logo')"
                  :disable="isUploadingLogo"
                >
                  <template v-slot:prepend><q-icon name="cloud_upload" color="primary" /></template>
                  <template v-slot:append>
                    <q-spinner v-if="isUploadingLogo" color="primary" size="1.5em" />
                  </template>
                </q-file>

                <div class="q-mt-sm relative-position" style="display: inline-block">
                  <q-img
                    :src="formData.storeLogo || baseLogo"
                    :error-src="baseLogo"
                    style="width: 80px; height: 80px; border-radius: 8px; border: 1px solid #ccc"
                    class="shadow-2 bg-white"
                  />
                  <q-btn
                    v-if="formData.storeLogo"
                    round
                    dense
                    color="negative"
                    icon="close"
                    size="xs"
                    class="absolute-top-right shadow-3"
                    style="top: -5px; right: -5px; z-index: 2"
                    @click="removeImage('logo')"
                  />
                </div>
              </div>

              <div class="col-12 col-md-6">
                <q-file
                  v-model="selectedBanner"
                  outlined
                  dense
                  bg-color="white"
                  :label="$t('seller.SET_STORE_BANNER', 'Store Banner') + ' ( 9 : 3 )'"
                  accept=".jpg, .jpeg, .png, .webp, image/*"
                  @update:model-value="file => uploadImage(file, 'banner')"
                  :disable="isUploadingBanner"
                >
                  <template v-slot:prepend><q-icon name="cloud_upload" color="primary" /></template>
                  <template v-slot:append>
                    <q-spinner v-if="isUploadingBanner" color="primary" size="1.5em" />
                  </template>
                </q-file>

                <div class="q-mt-sm relative-position" style="display: inline-block">
                  <q-img
                    :src="formData.storeBanner || baseBanner"
                    :error-src="baseBanner"
                    style="
                      width: 240px;
                      height: 80px;
                      border-radius: 8px;
                      border: 1px solid #ccc;
                      object-fit: cover;
                    "
                    class="shadow-2 bg-white"
                  />
                  <q-btn
                    v-if="formData.storeBanner"
                    round
                    dense
                    color="negative"
                    icon="close"
                    size="xs"
                    class="absolute-top-right shadow-3"
                    style="top: -5px; right: -5px; z-index: 2"
                    @click="removeImage('banner')"
                  />
                </div>
              </div>

              <div class="col-12">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  type="textarea"
                  v-model="formData.storeDescription"
                  :label="
                    $t('seller.SET_STORE_DESC', 'Store Description (Tell buyers about your shop)')
                  "
                  rows="3"
                >
                  <template v-slot:prepend><q-icon name="description" /></template>
                </q-input>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('seller.LBL_SHIPPING_PREF', 'Shipping & Delivery') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md items-stretch">
              <div class="col-12 col-md-6">
                <q-card flat bordered class="bg-grey-1 full-height" style="overflow: hidden">
                  <q-item tag="label" v-ripple class="full-height items-center">
                    <q-item-section>
                      <q-item-label :class="{ 'text-grey-6': !formData.shipping.isFree }">
                        {{ $t('seller.UI_FREE_SHIPPING', 'Offer Free Shipping') }}
                      </q-item-label>
                      <q-item-label caption>
                        {{
                          $t(
                            'seller.HINT_FREE_SHIPPING',
                            'You will pay the courier upfront. Buyers pay $0 for shipping.'
                          )
                        }}
                      </q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-toggle v-model="formData.shipping.isFree" color="primary" />
                    </q-item-section>
                  </q-item>
                </q-card>
              </div>

              <div class="col-12 col-md-6">
                <q-card flat bordered class="bg-grey-1 full-height" style="overflow: hidden">
                  <q-card-section class="q-pa-sm full-height column justify-center">
                    <q-input
                      outlined
                      dense
                      bg-color="white"
                      v-model.number="formData.shipping.flatRate"
                      :label="$t('seller.SET_FLAT_RATE', 'Flat Shipping Rate')"
                      type="number"
                      min="0"
                      step="0.01"
                      :disable="formData.shipping.isFree"
                      :hint="
                        formData.shipping.isFree
                          ? $t(
                              'seller.HINT_FLAT_RATE_DISABLED',
                              'Disabled because Free Shipping is active'
                            )
                          : $t(
                              'seller.HINT_FLAT_RATE_ACTIVE',
                              'The exact amount added to the buyer\'s cart.'
                            )
                      "
                    >
                      <template v-slot:prepend><q-icon name="local_shipping" /></template>
                    </q-input>
                  </q-card-section>
                </q-card>
              </div>
            </div>
          </div>

          <div class="q-mb-lg q-mt-xl">
            <div class="text-overline text-primary q-mb-xs">
              {{ $t('admin.LBL_SOCIAL_LINKS', 'Social & Contact') }}
            </div>
            <q-separator class="q-mb-sm" />

            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.email.url"
                  :label="$t('admin.SET_EMAIL_ADDRESS', 'Support Email Address')"
                  placeholder="contact@yourstore.com"
                  :readonly="!formData.socials.email.show"
                >
                  <template v-slot:prepend><q-icon name="mail" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.email.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.whatsapp.url"
                  :label="$t('admin.SET_WHATSAPP_URL', 'WhatsApp Number')"
                  placeholder="+12345678900"
                  :readonly="!formData.socials.whatsapp.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-whatsapp" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.whatsapp.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.viber.url"
                  :label="$t('admin.SET_VIBER_URL', 'Viber Number')"
                  placeholder="+12345678900"
                  :readonly="!formData.socials.viber.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-viber" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.viber.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.instagram.url"
                  :label="$t('admin.SET_INSTAGRAM_URL', 'Instagram URL')"
                  placeholder="https://instagram.com/your_profile"
                  :readonly="!formData.socials.instagram.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-instagram" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.instagram.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.facebook.url"
                  :label="$t('admin.SET_FACEBOOK_URL', 'Facebook URL')"
                  placeholder="https://facebook.com/your_page"
                  :readonly="!formData.socials.facebook.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-facebook" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.facebook.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.x.url"
                  :label="$t('admin.SET_X_URL', 'X (Twitter) URL')"
                  placeholder="https://x.com/your_handle"
                  :readonly="!formData.socials.x.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-x-twitter" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.x.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.tiktok.url"
                  :label="$t('admin.SET_TIKTOK_URL', 'TikTok URL')"
                  placeholder="https://tiktok.com/@your_profile"
                  :readonly="!formData.socials.tiktok.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-tiktok" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.tiktok.show" color="primary" dense />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-6">
                <q-input
                  outlined
                  dense
                  bg-color="white"
                  v-model="formData.socials.youtube.url"
                  :label="$t('admin.SET_YOUTUBE_URL', 'YouTube URL')"
                  placeholder="https://youtube.com/@your_channel"
                  :readonly="!formData.socials.youtube.show"
                >
                  <template v-slot:prepend><q-icon name="fab fa-youtube" /></template>
                  <template v-slot:append>
                    <q-toggle v-model="formData.socials.youtube.show" color="primary" dense />
                  </template>
                </q-input>
              </div>
            </div>
          </div>
        </div>
      </q-scroll-area>
    </div>

    <q-inner-loading :showing="isLoading">
      <q-spinner-gears size="50px" color="primary" />
    </q-inner-loading>
  </div>
</template>

<script setup>
  import { useI18n } from 'vue-i18n'
  import { ref, watch, onMounted } from 'vue'
  import api from 'src/utils/api'
  import { useAuthStore } from 'src/stores/auth.store'
  import { useAdminStore } from 'src/stores/admin.store' // 🌟 NEW: Import Admin Store
  import { useNotifyStore } from 'src/stores/notify.store'

  import baseBanner from 'src/assets/base.banner.png'
  import baseLogo from 'src/assets/base.logo.png'

  const { t } = useI18n({ useScope: 'global' })
  const authStore = useAuthStore()
  const adminStore = useAdminStore() // 🌟 NEW: Initialize Admin Store
  const notifyStore = useNotifyStore()

  // --- Upload States ---
  const selectedLogo = ref(null)
  const isUploadingLogo = ref(false)
  const selectedBanner = ref(null)
  const isUploadingBanner = ref(false)

  const isLoading = ref(false)
  const hasChanges = ref(false)

  // 🌟 NEW: Track the currently loaded ID so we know if God Mode switched
  const currentlyLoadedId = ref(null)

  // 1. Reactive form state
  const formData = ref({
    storeName: '',
    storeDescription: '',
    storeLogo: '',
    storeBanner: '',
    shipping: { isFree: false, flatRate: 0 },
    socials: {
      email: { url: '', show: true },
      whatsapp: { url: '', show: true },
      viber: { url: '', show: true },
      instagram: { url: '', show: true },
      facebook: { url: '', show: true },
      x: { url: '', show: true },
      tiktok: { url: '', show: true },
      youtube: { url: '', show: true }
    }
  })

  // 2. Helper function to populate data safely
  const populateFormData = profile => {
    const socials = profile?.socials || {}

    formData.value = {
      storeName: profile?.storeName || '',
      storeDescription: profile?.storeDescription || '',
      storeLogo: profile?.storeLogo || '',
      storeBanner: profile?.storeBanner || '',
      shipping: {
        isFree: profile?.shipping?.isFree || false,
        flatRate: profile?.shipping?.flatRate || 0
      },
      socials: {
        email: { url: socials.email?.url || '', show: socials.email?.show ?? true },
        whatsapp: { url: socials.whatsapp?.url || '', show: socials.whatsapp?.show ?? true },
        viber: { url: socials.viber?.url || '', show: socials.viber?.show ?? true },
        instagram: { url: socials.instagram?.url || '', show: socials.instagram?.show ?? true },
        facebook: { url: socials.facebook?.url || '', show: socials.facebook?.show ?? true },
        x: { url: socials.x?.url || '', show: socials.x?.show ?? true },
        tiktok: { url: socials.tiktok?.url || '', show: socials.tiktok?.show ?? true },
        youtube: { url: socials.youtube?.url || '', show: socials.youtube?.show ?? true }
      }
    }

    // Reset changes flag AFTER population
    setTimeout(() => {
      hasChanges.value = false
    }, 50)
  }

  // 🌟 NEW: Fetch data based on Impersonation Status
  const fetchProfileData = async () => {
    const targetId = adminStore.impersonatedSellerId
    currentlyLoadedId.value = targetId || authStore.userProfile?._id

    // Mode 1: Normal Seller (Use local store)
    if (!targetId) {
      if (authStore.userProfile?.storeProfile) {
        populateFormData(authStore.userProfile.storeProfile)
      }
      return
    }

    // Mode 2: God Mode (Fetch target seller from backend)
    isLoading.value = true
    try {
      // Re-using your public getSellerProfile route since it returns what we need!
      const response = await api.get(`/open/seller-profile/${targetId}`)
      if (response.data.success) {
        populateFormData(response.data.profile)
      }
    } catch (error) {
      console.error('Failed to load impersonated seller profile:', error)
    } finally {
      isLoading.value = false
    }
  }

  // --- Cloudinary Logic ---
  const uploadImage = async (file, type) => {
    if (!file) return

    if (type === 'logo') isUploadingLogo.value = true
    if (type === 'banner') isUploadingBanner.value = true

    const uploadData = new FormData()
    uploadData.append('image', file)

    try {
      const response = await api.post('/auth/upload', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data && response.data.url) {
        // Smart Cleanup: If they are overwriting an existing image, delete the old one from the cloud!
        const existingImage =
          type === 'logo' ? formData.value.storeLogo : formData.value.storeBanner
        if (existingImage && existingImage.includes('cloudinary.com')) {
          api.post('/auth/upload/delete', { imageUrl: existingImage }).catch(() => {})
        }

        // Apply new image
        if (type === 'logo') formData.value.storeLogo = response.data.url
        if (type === 'banner') formData.value.storeBanner = response.data.url

        notifyStore.notify(200, t('msgSystem.IMG_UPLOAD_SUCCESS', 'Image uploaded successfully!'))
      }
    } catch (error) {
      console.error('Upload failed:', error)
      notifyStore.notify(
        500,
        t('msgSystem.IMG_UPLOAD_FAILED', 'Failed to upload image. Please try again.')
      )
    } finally {
      if (type === 'logo') {
        selectedLogo.value = null
        isUploadingLogo.value = false
      }
      if (type === 'banner') {
        selectedBanner.value = null
        isUploadingBanner.value = false
      }
    }
  }

  const removeImage = async type => {
    const imageUrl = type === 'logo' ? formData.value.storeLogo : formData.value.storeBanner

    // Instantly remove from UI
    if (type === 'logo') formData.value.storeLogo = ''
    if (type === 'banner') formData.value.storeBanner = ''

    // Quietly tell backend to clean up Cloudinary storage
    if (imageUrl && imageUrl.includes('cloudinary.com')) {
      try {
        await api.post('/auth/upload/delete', { imageUrl })
      } catch {
        console.warn('Failed to clean up image from Cloudinary')
      }
    }
  }

  // 3. Initialize Data
  onMounted(() => {
    fetchProfileData()

    // Set up the watcher to track manual user typing.
    setTimeout(() => {
      watch(
        formData,
        () => {
          hasChanges.value = true
        },
        { deep: true }
      )
    }, 500)
  })

  // 4. Save Function
  const saveProfile = async () => {
    if (!hasChanges.value) return

    isLoading.value = true
    try {
      let url = '/auth/seller/updateStoreProfile'

      // 🌟 If in God Mode, tell the backend WHO to update
      if (adminStore.impersonatedSellerId) {
        url += `?targetSellerId=${adminStore.impersonatedSellerId}`
      }

      const response = await api.put(url, {
        storeProfile: formData.value
      })

      // Only update local Auth Store if we are NOT in God Mode
      if (!adminStore.impersonatedSellerId && authStore.userProfile) {
        authStore.userProfile.storeProfile = response.data.storeProfile
      }

      hasChanges.value = false
    } catch (error) {
      console.error('Failed to save store profile:', error)
    } finally {
      isLoading.value = false
    }
  }
</script>
