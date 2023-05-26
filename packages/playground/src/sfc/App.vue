<script setup>
import BlogPost from './BlogPost.vue'

const id = ref('1')
function randomPick() {
  id.value = String(Math.floor(Math.random() * 100) + 1)
}
</script>

<template>
  <button class="random-pick-post-btn" @click="randomPick">
    Random pick a post
  </button>
  <BlogPost :id="id" />
</template>

<style scoped>
.random-pick-post-btn {
  margin-bottom: 1rem;
  font-size: 1rem;
  background: #334155;
  border-radius: 0.25rem;
  color: #fff;
  padding: 0.5rem 1rem;
  border: none;
  outline: none;
  cursor: pointer;
}
</style>
