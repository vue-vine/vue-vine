<script setup lang="ts">
import type { Directive } from 'vue'
import { nextTick } from 'vue'

const props = defineProps<{
  version: string
}>()

const vDisplayText: Directive = {
  mounted(el) {
    nextTick(() => {
      el.textContent = props.version
    })
  },
}
</script>

<template>
  <code v-display-text version />
</template>
