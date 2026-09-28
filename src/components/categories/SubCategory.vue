<template>
  <q-badge
    :outline="!active"
    class="q-mx-xs product-horizontal rounded-borders text-caption text-uppercase non-selectable"
    :class="active ? 'bg-primary text-white' : 'text-primary'"
  >
    <div class="row full-width">
      <div ref="titleText" class="col-12 text-center ellipsis">
        {{ title[locale] || title['en-US'] || '' }}
      </div>
    </div>

    <q-tooltip
      v-if="isOverflowing"
      :delay="1000"
      class="bg-light-blue-1 text-primary"
      anchor="bottom middle"
      self="top middle"
    >
      {{ title[locale] || title['en-US'] || '' }}
    </q-tooltip>
  </q-badge>
</template>

<script setup>
  // 1. Vue & Library Imports
  import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
  import { useI18n } from 'vue-i18n'

  const { locale } = useI18n({ useScope: 'global' })

  // 2. Props
  defineProps({
    title: {
      type: Object,
      default: () => ({ 'en-US': 'Undefined Label' })
    },
    active: {
      type: Boolean,
      default: false
    }
  })

  // 3. State & Refs
  const titleText = ref(null)
  const isOverflowing = ref(false)
  let resizeObserver = null // Holds our performant observer

  // 4. Methods
  const checkOverflow = () => {
    if (titleText.value) {
      const { scrollWidth, clientWidth } = titleText.value
      // If the scrollable width is larger than the visible width, it's overflowing!
      isOverflowing.value = scrollWidth > clientWidth
    }
  }

  // 5. Watchers
  // 🚀 FIX: If the user changes language, the new word might be longer or shorter.
  // We must wait for the DOM to update (nextTick), then re-measure the overflow.
  watch(locale, async () => {
    await nextTick()
    checkOverflow()
  })

  // 6. Lifecycle Hooks
  onMounted(() => {
    // Initial check
    checkOverflow()

    // 🚀 FIX: Use modern ResizeObserver instead of global window resize listeners
    if (titleText.value && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(checkOverflow)
      resizeObserver.observe(titleText.value)
    } else {
      // Fallback for extremely old browsers (rarely needed today)
      window.addEventListener('resize', checkOverflow)
    }
  })

  onUnmounted(() => {
    // Always clean up to prevent memory leaks!
    if (resizeObserver) {
      resizeObserver.disconnect()
    } else {
      window.removeEventListener('resize', checkOverflow)
    }
  })
</script>

<style lang="scss" scoped>
  .product-horizontal {
    width: 200px;
    height: 35px;
    cursor: pointer;
    /* Add transition for smooth color change */
    transition: all 0.3s ease;
  }
</style>
