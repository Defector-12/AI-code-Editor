<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import GlobalHeader from '@/components/GlobalHeader.vue'
import GlobalFooter from '@/components/GlobalFooter.vue'

const collapsed = ref(false)
const route = useRoute()
const key = computed(() => route.fullPath)
</script>

<template>
  <a-layout style="min-height: 100vh">
    <a-layout-header style="padding: 0; background: transparent">
      <GlobalHeader />
    </a-layout-header>
    <a-layout-content style="padding: 16px 24px 64px 24px">
      <router-view :key="key" />
    </a-layout-content>
    <a-layout-footer
      style="
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 8px 16px;
        text-align: center;
        background: #fff;
        border-top: 1px solid #f0f0f0;
      "
    >
      <GlobalFooter />
    </a-layout-footer>
  </a-layout>
</template>

<style scoped>
:deep(.ant-layout) {
  background: #f5f5f5;
}

:deep(.ant-layout-header) {
  background: #ffffff;
  border-bottom: 1px solid #f0f0f0;
}

:deep(.ant-layout-content) {
  background: transparent;
}
</style>
