<template>
  <div>
    <q-item
      class="text-primary text-weight-bold" 
      clickable 
      tag="a" 
      :to="'/category/' + link"
      :active="isActive" 
      active-class="bg-blue-1"
    >
      <q-item-section>
        <q-item-label>{{ title[locale] || $t('label.MSG_NO_CATEGORY') }}</q-item-label>
      </q-item-section>
    </q-item>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale } = useI18n({ useScope: 'global' })

const props = defineProps({
  title: { type: Object, default: () => ({}) },
  link: { type: String, default: '#' },
  activeId: { type: String, default: '' },
  // 1. Add 'sub' to props so we can check children
  sub: { type: Array, default: () => [] } 
})

// 2. Update logic: Active if (Self matches) OR (Any child matches)
const isActive = computed(() => {
  // A. Direct match (User clicked "Tools")
  if (props.link === props.activeId) return true

  // B. Child match (User clicked "Hammers", which is inside "Tools")
  if (props.sub && props.sub.length > 0) {
    return props.sub.some(child => child.link === props.activeId)
  }

  return false
})
</script>