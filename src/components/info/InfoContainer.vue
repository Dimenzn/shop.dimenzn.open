<template>
  <div
    class="column no-wrap TopPickContainer bg-white shadow-3 q-ma-sm q-pa-sm"
    style="height: calc(100dvh - 120px); border-radius: 16px; overflow: hidden"
  >
    <div class="col-auto text-center q-pb-sm">
      <q-avatar size="48px" class="q-mt-sm q-mb-xs">
        <img :src="companyLogo" loading="lazy" alt="Company Logo" style="object-fit: contain" />
      </q-avatar>

      <div class="text-h6 text-weight-bolder text-primary" style="letter-spacing: 0.1em">
        {{ companyName }}
      </div>
      <div class="text-caption text-grey-7 q-px-md q-mb-sm">
        {{
          $t(
            'info.APP_DESCRIPTION',
            'The best place to find amazing products and unbeatable deals.'
          )
        }}
      </div>
      <q-separator />
    </div>

    <q-scroll-area class="col">
      <div class="q-pa-sm">
        <div class="text-subtitle2 text-grey-6 q-mb-xs q-px-sm text-uppercase">
          {{ $t('info.HELP_SUPPORT', 'Help & Support') }}
        </div>
        <q-list padding class="rounded-borders">
          <q-item clickable v-ripple to="/shipping">
            <q-item-section avatar>
              <q-icon name="local_shipping" color="primary" />
            </q-item-section>
            <q-item-section>{{ $t('info.SHIPPING', 'Shipping & Returns') }}</q-item-section>
            <q-item-section side><q-icon name="chevron_right" /></q-item-section>
          </q-item>

          <q-item clickable v-ripple to="/faq">
            <q-item-section avatar>
              <q-icon name="help_outline" color="primary" />
            </q-item-section>
            <q-item-section>{{ $t('info.FAQ', 'FAQ') }}</q-item-section>
            <q-item-section side><q-icon name="chevron_right" /></q-item-section>
          </q-item>
        </q-list>

        <div class="text-subtitle2 text-grey-6 q-mb-xs q-mt-sm q-px-sm text-uppercase">
          {{ $t('info.LEGAL', 'Legal') }}
        </div>
        <q-list padding class="rounded-borders">
          <q-item clickable v-ripple to="/terms">
            <q-item-section avatar>
              <q-icon name="description" color="grey-7" />
            </q-item-section>
            <q-item-section>{{ $t('info.TERMS', 'Terms of Service') }}</q-item-section>
            <q-item-section side><q-icon name="chevron_right" /></q-item-section>
          </q-item>

          <q-item clickable v-ripple to="/privacy">
            <q-item-section avatar>
              <q-icon name="policy" color="grey-7" />
            </q-item-section>
            <q-item-section>{{ $t('info.PRIVACY', 'Privacy Policy') }}</q-item-section>
            <q-item-section side><q-icon name="chevron_right" /></q-item-section>
          </q-item>
        </q-list>

        <q-separator spaced />

        <template v-if="hasAnySocialLinks">
          <div class="text-subtitle2 text-grey-6 q-mb-sm q-mt-sm q-px-sm text-uppercase">
            {{ $t('info.CONTACT', 'Connect') }}
          </div>
          <div class="row q-gutter-md q-px-sm q-pb-md justify-center">
            <q-btn
              v-if="socialEmail.show"
              round
              flat
              color="primary"
              icon="mail"
              type="a"
              :href="`mailto:${socialEmail.url}`"
            />

            <q-btn
              v-if="socialWhatsapp.show"
              round
              flat
              color="positive"
              icon="fab fa-whatsapp"
              type="a"
              :href="`https://wa.me/${cleanPhoneForLink(socialWhatsapp.url)}`"
              target="_blank"
            />

            <q-btn
              v-if="socialX.show"
              round
              flat
              color="dark"
              icon="fab fa-x-twitter"
              type="a"
              :href="socialX.url"
              target="_blank"
            />

            <q-btn
              v-if="socialInstagram.show"
              round
              flat
              color="negative"
              icon="fab fa-instagram"
              type="a"
              :href="socialInstagram.url"
              target="_blank"
            />

            <q-btn
              v-if="socialFacebook.show"
              round
              flat
              color="blue-8"
              icon="fab fa-facebook"
              type="a"
              :href="socialFacebook.url"
              target="_blank"
            />

            <q-btn
              v-if="socialTiktok.show"
              round
              flat
              color="dark"
              icon="fab fa-tiktok"
              type="a"
              :href="socialTiktok.url"
              target="_blank"
            />

            <q-btn
              v-if="socialYoutube.show"
              round
              flat
              color="red-14"
              icon="fab fa-youtube"
              type="a"
              :href="socialYoutube.url"
              target="_blank"
            />
          </div>
        </template>

        <div class="text-center text-caption text-grey-5 q-mt-lg q-mb-md">
          <div>&copy; {{ new Date().getFullYear() }} {{ companyName }}</div>
          <div>{{ $t('info.VERSION', 'Version') }} 2.0.0</div>
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup>
  import { computed } from 'vue'
  import { useUIStore } from 'stores/ui.store'

  const uiStore = useUIStore()

  // App Info
  const companyName = computed(() => uiStore.ui[0]?.companyName || '')
  const companyLogo = computed(() => uiStore.ui[0]?.urlImageCompanyLogo || '')

  // Social Objects (Maps exactly to your database structure)
  // We use a safe fallback object so the app doesn't crash if the DB hasn't loaded yet
  const socialEmail = computed(
    () => uiStore.ui[0]?.email || { show: false, url: 'team@dimenzn.com' }
  )
  const socialWhatsapp = computed(() => uiStore.ui[0]?.whatsapp || { show: false, url: '' })
  const socialX = computed(() => uiStore.ui[0]?.x || { show: false, url: 'https://x.com' })
  const socialInstagram = computed(
    () => uiStore.ui[0]?.instagram || { show: false, url: 'https://instagram.com' }
  )
  const socialFacebook = computed(() => uiStore.ui[0]?.facebook || { show: false, url: '' })
  const socialTiktok = computed(() => uiStore.ui[0]?.tiktok || { show: false, url: '' })
  const socialYoutube = computed(() => uiStore.ui[0]?.youtube || { show: false, url: '' })

  // Hide the entire section if ALL toggles are false
  const hasAnySocialLinks = computed(() => {
    return (
      socialEmail.value.show ||
      socialWhatsapp.value.show ||
      socialX.value.show ||
      socialInstagram.value.show ||
      socialFacebook.value.show ||
      socialTiktok.value.show ||
      socialYoutube.value.show
    )
  })

  // Helper to remove spaces, brackets, and plus signs for WhatsApp/Viber links
  const cleanPhoneForLink = phone => {
    if (!phone) return ''
    return String(phone).replace(/[^0-9]/g, '')
  }
</script>
