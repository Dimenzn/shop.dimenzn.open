import { computed } from 'vue'
import { useQuasar } from 'quasar'
import { useRoute } from 'vue-router'

/**
 * @param {Ref<boolean>} drawerState - The reactive state of your left drawer
 * @param {number} width - The width of your drawer in pixels (default 300)
 */
export function useDialogOffset(drawerState, width = 300) {
  const $q = useQuasar()
  const route = useRoute()

  const offsetStyle = computed(() => {
    // 1. Check if the drawer is open
    // 2. Check if we are NOT on mobile/tablet (where the drawer becomes an overlay)
    // Quasar usually switch to overlay mode below 'md' breakpoint (1024px)

    const isPushed = drawerState.value && !$q.screen.lt.md && !route.meta.requiresFullscreen

    return {
      transform: isPushed ? `translateX(${width / 2}px)` : 'translateX(0px)',
      transition: 'transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1)',
      // Ensure the card doesn't jitter during the sidebar transition
      willChange: 'transform'
    }
  })

  return {
    offsetStyle
  }
}
