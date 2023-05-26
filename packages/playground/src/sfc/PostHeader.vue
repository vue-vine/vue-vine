<script setup lang="ts">
defineProps<{
  title: string
  author: string
}>()
</script>

<template>
  <header>
    <div class="blog-title">
      {{ title }}
    </div>
    <div class="blog-meta">
      <span class="blog-meta-item">
        <strong>Author: </strong>{{ author }}</span>
      <span class="blog-meta-item">
        <strong>Published: </strong>{{ new Date().toLocaleDateString() }}</span>
    </div>
  </header>
</template>

<style scoped>
.blog-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
}
.blog-meta-item {
  margin-right: 8px;
}
</style>
