<script setup lang="ts">
import PostHeader from './PostHeader.vue'
import { randomString } from '~/utils'

const props = defineProps<{ id: string }>()

const loading = ref(true)
const abstract = ref('')
function mockPostUpdate() {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    abstract.value = `Post #${props.id} - ${randomString(30)}`
  }, 2000)
}

// Mock result of a network request
watch(() => props.id, () => {
  mockPostUpdate()
}, { immediate: true })
</script>

<template>
  <article>
    <PostHeader title="Vue Vine Playground" author="ShenQingchuan" />
    <div class="blog-post-abstract-title">
      Blog post abstract:
    </div>
    <div v-if="loading" class="loading-view">
      <div class="icon-loading" />
      <span>Loading...</span>
    </div>
    <p v-else class="blog-post-abstract">
      {{ abstract }}
    </p>
  </article>
</template>

<style scoped lang="scss">
.loading-view {
  margin: 1rem 0;
}
.blog-post-abstract {
  margin-top: 16px;
  font-style: italic;
}
.blog-post-abstract-title {
  margin: 0.5rem 0;
  font-weight: bold;
  opacity: 0.8;
}
</style>
