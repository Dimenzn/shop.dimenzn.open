// src/boot/i18n.js
import { defineBoot } from '#q-app/wrappers'
import { createI18n } from 'vue-i18n'

// 1. Add ?raw to the end! This bypasses the crashing plugins.
import rawLanguages from 'sharedDB/languages.json?raw'

// 2. We parse the raw text string into a real JavaScript object ourselves
const sampleLanguages = JSON.parse(rawLanguages)

// 3. The rest of the extraction stays exactly the same
const dbArray = sampleLanguages?.default || sampleLanguages
const enUSLang = Array.isArray(dbArray) ? dbArray.find(lang => lang.value === 'en-US') : undefined

const messages = {
  'en-US': enUSLang
    ? enUSLang.i18n
    : {
        label: {
          NET_ERR_OFF: 'DB IMPORT FAILED (Check boot file)',
          NET_ERR_LOST: 'Cannot connect.',
          NET_ERR_RECON: 'Try to Reconnect'
        }
      }
}

console.log('📦 [i18n TRACKER] 1. Initialized with LOCAL fallback data:', messages['en-US'])

let i18nInstance

export default defineBoot(({ app }) => {
  i18nInstance = createI18n({
    locale: 'en-US',
    fallbackLocale: 'en-US',
    legacy: false,
    globalInjection: true,
    messages,
    warnHtmlMessage: false
  })

  app.use(i18nInstance)
})

export { i18nInstance }
