import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

export function useHorizontalScroll(scrollArea) {
  // Constants
  const DRAG_THRESHOLD = 10
  const CARD_WIDTH = 200
  const MARGIN_X = 8
  const CARD_TOTAL_WIDTH = CARD_WIDTH + MARGIN_X
  const router = useRouter()

  // Scrollbar Styles
  const thumbStyle = { width: '0px', height: '0px', opacity: 0 }
  const barStyle = { width: '0px', height: '0px', opacity: 0 }

  // Reactive References
  //const scrollArea = ref(null)
  const canScrollLeft = ref(false)
  const canScrollRight = ref(false)

  // Drag State
  let isDragging = false
  let isClickSafe = true
  let startX = 0
  let startY = 0
  let scrollLeft = 0

  // Scroll State Management
  const updateButtonStates = () => {
    const scrollTarget = scrollArea.value?.getScrollTarget()
    if (!scrollTarget) return

    const currentScroll = scrollTarget.scrollLeft
    const clientWidth = scrollTarget.clientWidth
    const maxScroll = scrollTarget.scrollWidth - clientWidth

    canScrollLeft.value = currentScroll > 0
    canScrollRight.value = currentScroll < maxScroll - 1
  }

  // Event Handlers
  const handleScroll = () => updateButtonStates()

  // Drag Handlers
  const onMouseDown = e => {
    const scrollTarget = scrollArea.value.getScrollTarget()
    isDragging = true
    startX = e.pageX - scrollTarget.offsetLeft
    scrollLeft = scrollTarget.scrollLeft
    scrollTarget.classList.add('dragging')
  }

  const onMouseMove = e => {
    if (!isDragging) {
      isClickSafe = true
      return
    }

    const scrollTarget = scrollArea.value.getScrollTarget()
    const diffX = Math.abs(e.pageX - startX)
    const diffY = Math.abs(e.pageY - startY)

    if (diffX > DRAG_THRESHOLD || diffY > DRAG_THRESHOLD) {
      isClickSafe = false
    }

    const x = e.pageX - scrollTarget.offsetLeft
    scrollTarget.scrollLeft = scrollLeft - (x - startX)
  }

  const onMouseUp = () => {
    isDragging = false
    scrollArea.value?.getScrollTarget()?.classList.remove('dragging')
  }

  // Navigation Controls
  const handleRightClick = () => {
    const scrollTarget = scrollArea.value?.getScrollTarget()
    if (!scrollTarget) return

    const currentScroll = scrollTarget.scrollLeft
    const clientWidth = scrollTarget.clientWidth
    const maxScroll = scrollTarget.scrollWidth - clientWidth
    const rightEdge = currentScroll + clientWidth

    const lastCardIndex = Math.floor((rightEdge - 1) / CARD_TOTAL_WIDTH)
    const lastCardEnd = (lastCardIndex + 1) * CARD_TOTAL_WIDTH

    const newPos =
      lastCardEnd > rightEdge
        ? lastCardIndex * CARD_TOTAL_WIDTH
        : Math.min(currentScroll + clientWidth, maxScroll)

    scrollTarget.scrollTo({ left: newPos, behavior: 'smooth' })
    setTimeout(updateButtonStates, 500)
  }

  const handleLeftClick = () => {
    const scrollTarget = scrollArea.value?.getScrollTarget()
    if (!scrollTarget) {
      return
    }

    // Scroll directly to the beginning of the container (left: 0)
    scrollTarget.scrollTo({ left: 0, behavior: 'smooth' })

    // Update button states after a short delay
    setTimeout(updateButtonStates, 500)
  }

  const handleCardClick = (route, id, event) => {
    if (!isClickSafe) {
      event.stopPropagation()
      isClickSafe = true
      return
    }
    console.log(id)
    router.push('/' + route + '/' + id)
  }

  // --- NEW SAFE FUNCTION ---
  const centerOnElement = elementId => {
    // 1. Check if the Quasar scroll area is ready
    const scrollTarget = scrollArea.value?.getScrollTarget()
    if (!scrollTarget) return

    // 2. Look for the specific button ID
    const activeElement = document.getElementById(elementId)
    if (!activeElement) return // Fail silently if button isn't found

    // 3. Do the math
    const containerWidth = scrollTarget.clientWidth
    const elementWidth = activeElement.clientWidth
    const offsetLeft = activeElement.offsetLeft

    const centerPosition = offsetLeft - containerWidth / 2 + elementWidth / 2

    // 4. Scroll smoothly
    scrollTarget.scrollTo({ left: centerPosition, behavior: 'smooth' })

    // 5. Update the left/right arrow buttons if they are being used
    setTimeout(updateButtonStates, 500)
  }

  // Lifecycle Hooks
  onMounted(() => {
    const scrollTarget = scrollArea.value?.getScrollTarget()
    if (!scrollTarget) return

    scrollTarget.addEventListener('scroll', handleScroll)
    scrollTarget.addEventListener('mousedown', onMouseDown)
    scrollTarget.addEventListener('mousemove', onMouseMove)
    scrollTarget.addEventListener('mouseup', onMouseUp)
    scrollTarget.addEventListener('mouseleave', onMouseUp)
    updateButtonStates()
  })

  onBeforeUnmount(() => {
    const scrollTarget = scrollArea.value?.getScrollTarget()
    if (!scrollTarget) return

    scrollTarget.removeEventListener('scroll', handleScroll)
    scrollTarget.removeEventListener('mousedown', onMouseDown)
    scrollTarget.removeEventListener('mousemove', onMouseMove)
    scrollTarget.removeEventListener('mouseup', onMouseUp)
    scrollTarget.removeEventListener('mouseleave', onMouseUp)
  })

  // Expose public properties and methods
  return {
    canScrollLeft,
    canScrollRight,
    handleLeftClick,
    handleRightClick,
    handleCardClick,
    thumbStyle,
    barStyle,
    centerOnElement
  }
}
