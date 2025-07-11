<script setup lang="ts">
import { useI18n } from '../i18n'

const { t } = useI18n()
</script>

<template>
  <div align="center">
    <div class="my-8 w-20% border-t-solid border-t-1px border-gray-300/20" />
    <h1 class="mt-8 text-2xl font-semibold text-center">
      {{ t('sponsors') }}
    </h1>
    <img src="https://raw.githubusercontent.com/ShenQingchuan/ShenQingchuan/main/sponsors.svg">
  </div>
</template>
