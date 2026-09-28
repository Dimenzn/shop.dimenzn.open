// src/composables/useTooltipOnOverflow.js

import { ref, onMounted, onUnmounted, watch } from 'vue'

export function useTooltipOnOverflow(elementRef) {
  const isOverflowing = ref(false)

  const checkOverflow = () => {
    // We need to find the actual label element within the q-input's shadow DOM.
    // The specific class might change, but this is a common one for Quasar labels.
    if (elementRef.value) {
      const labelElement = elementRef.value.$el.querySelector('.q-field__label')
      if (labelElement) {
        // The check: if scrollWidth is greater than clientWidth, the content is hidden.
        isOverflowing.value = labelElement.scrollWidth > labelElement.clientWidth
      }
    }
  }

  onMounted(() => {
    checkOverflow()
    window.addEventListener('resize', checkOverflow)

    // Watch for changes in the q-input's model which can affect the label's size
    // Note: This watcher may need to be adjusted based on how your labels update
    watch(elementRef, checkOverflow, { deep: true })
  })

  onUnmounted(() => {
    window.removeEventListener('resize', checkOverflow)
  })

  return {
    isOverflowing,
  }
}
