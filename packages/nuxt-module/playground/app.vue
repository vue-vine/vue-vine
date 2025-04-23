<script setup lang="ts">
import { useTemplateRef } from 'vue';
import Welcome from './welcome.vine'
const divRef = useTemplateRef('foo')
</script>

<template>
  <div ref="foo" style="text-align: center;">
    <Welcome content="Nuxt module playground!" />
  </div>
</template>
