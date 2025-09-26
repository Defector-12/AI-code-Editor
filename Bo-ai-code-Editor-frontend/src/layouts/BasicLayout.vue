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
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <GlobalHeader />
    </a-layout-header>
    <a-layout-content class="app-content">
      <router-view :key="key" />
    </a-layout-content>
    <a-layout-footer class="app-footer">
      <GlobalFooter />
    </a-layout-footer>
  </a-layout>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: transparent;
  --footer-height: 64px;
}

.app-header {
  padding: 12px 20px;
  background: rgba(23, 10, 34, 0.55);
  border-bottom: 1px solid var(--surface-border);
  backdrop-filter: blur(var(--blur-strength));
  box-shadow: 0 10px 24px rgba(8, 2, 20, 0.32);
}

.app-content {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.app-content::after {
  content: '';
  display: block;
  height: calc(var(--footer-height) + 32px);
}

.app-footer {
  position: static;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--footer-height);
  padding: 12px 24px;
  text-align: center;
  background: rgba(23, 10, 34, 0.55);
  border-top: 1px solid var(--surface-border);
  backdrop-filter: blur(var(--blur-strength));
  box-shadow: 0 -12px 24px rgba(8, 2, 20, 0.28);
  z-index: 1000;
}

:deep(.ant-layout-content) {
  background: transparent;
}

@media (max-width: 768px) {
  .app-content {
    padding: 16px;
    gap: 20px;
  }

  .app-content::after {
    height: calc(var(--footer-height) + 24px);
  }

  .app-header,
  .app-footer {
    padding: 10px 16px;
  }
}
</style>
