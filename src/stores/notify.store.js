import { defineStore } from 'pinia'
import { ref } from 'vue'
import { Notify } from 'quasar'
import { i18nInstance } from 'src/boot/i18n'

export const useNotifyStore = defineStore('notify', () => {
  const type = ref(null)
  const message = ref(null)

  const notify = (status, msg) => {
    // 1. Guard Clause: Ignore silent background operations
    if (
      status === 502 ||
      status === 503 ||
      !msg ||
      msg === 'SILENT' ||
      msg === 'AUTH_TOKEN_EXPIRED'
    ) {
      return
    }

    message.value = msg

    const numStr = String(status)
    let color = 'primary'
    let textColor = 'white'
    let icon = 'info'

    // 2. Status Mapping & Theming
    if (numStr.startsWith('2')) {
      type.value = status === 200 ? 'info' : 'positive'
      icon = 'check_circle'
      color = 'white'
      textColor = 'primary'
    } else if (numStr.startsWith('4')) {
      type.value = 'warning'
      icon = 'warning'
      color = 'warning'
      textColor = 'dark'
    } else if (numStr.startsWith('5')) {
      type.value = 'negative'
      icon = 'error'
      color = 'negative'
      textColor = 'white'
    } else {
      type.value = 'info'
      color = 'white'
      textColor = 'primary'
    }

    // 3. 🚀 CRITICAL FIX: Smart Translation Logic
    const { t, te } = i18nInstance.global

    // Check if the developer already passed a prefix (contains a dot)
    const translationKey = msg.includes('.') ? msg : `msgSystem.${msg}`

    // Use translation if it exists, otherwise fallback to the raw message
    const displayMessage = te(translationKey) ? t(translationKey) : msg

    // 4. Fire Quasar Notification
    Notify.create({
      message: displayMessage,
      position: 'top',
      color: color,
      textColor: textColor,
      icon: icon,
      timeout: 3000,
      classes: 'box-theme-notify'
    })
  }

  return { type, message, notify }
})
