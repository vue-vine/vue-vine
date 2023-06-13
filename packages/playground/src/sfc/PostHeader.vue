<script setup lang="ts">
defineProps<{
  title: string
  author: string
}>()

const isDark = useDark()
const metaBgColor = ref('')
watchEffect(() => {
  metaBgColor.value = isDark.value
    ? '#333'
    : '#ddd'
})
</script>

<template>
  <header>
    <div class="blog-title">
      {{ title }}
    </div>
    <div class="blog-meta">
      <div class="blog-meta-line">
        <span class="blog-meta-span">
          <strong>Author: </strong>{{ author }}
        </span>
        <span class="blog-meta-span">
          <strong>Published: </strong>{{ new Date().toLocaleDateString() }}
        </span>
      </div>
      <div class="blog-meta-line change-bg" @click="metaBgColor = '#59e'">
        <span class="blog-meta-span">
          Click here to change this card's background color!
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.blog-title {
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
}
.blog-meta {
  display: flex;
  flex-direction: column;
  margin: 8px 0;
  padding: 6px;
  background-color: v-bind(metaBgColor);
  border-radius: 6px;
}
.blog-meta-line {
  padding: 6px 0;
}
.blog-meta-line.change-bg {
  cursor: pointer;
}
.blog-meta-span {
  margin: 0 8px;
}
</style>
