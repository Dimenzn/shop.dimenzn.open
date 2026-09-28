<template>
  <q-input
    :model-value="modelValue"
    @update:model-value="updateValue"
    :label="label"
    :dense="dense"
    :outlined="outlined"
    :disable="disable"
    :readonly="readonly"
    :clearable="clearable"
    mask="#,###,###,###"
    reverse-fill-mask
    input-class="text-right"
    :suffix="currencySymbol"
    @clear="onClear"
  />
</template>

<script setup>
  import { computed } from 'vue'
  import { useUIStore } from 'src/stores/ui.store'

  defineProps({
    modelValue: [Number, String],
    label: String,
    dense: { type: Boolean, default: true },
    outlined: { type: Boolean, default: true },
    disable: Boolean,
    readonly: Boolean,
    clearable: Boolean
  })

  const uiStore = useUIStore()
  const emit = defineEmits(['update:modelValue'])

  // Computed currency symbol from Store
  const currencySymbol = computed(() => {
    // Access the first item in the UI array, fallback to empty
    return uiStore.ui[0]?.currency ? ` ${uiStore.ui[0].currency}` : ''
  })

  const updateValue = val => {
    // Handle empty input (null) vs actual 0
    if (!val && val !== 0 && val !== '0') {
      emit('update:modelValue', null)
      return
    }

    // 1. Convert to String (handle potential nulls)
    const strVal = val.toString()

    // 2. Remove commas (e.g. "1,200" -> "1200")
    const rawValue = strVal.replace(/,/g, '')

    // 3. Parse Integer
    const num = parseInt(rawValue, 10)

    // 4. Return 0 if NaN, otherwise the number
    emit('update:modelValue', isNaN(num) ? 0 : num)
  }

  const onClear = () => {
    emit('update:modelValue', null)
  }
</script>
