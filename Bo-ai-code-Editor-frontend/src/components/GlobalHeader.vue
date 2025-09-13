<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

type MenuItem = {
  key: string
  label: string
  path?: string
  children?: MenuItem[]
}

const router = useRouter()
const route = useRoute()

// 可通过后续配置替换
const siteTitle = 'AI-code-Editor'
const menuItems = ref<MenuItem[]>([
  { key: 'home', label: '首页', path: '/' },
  { key: 'about', label: '关于', path: '/about' },
])

const selectedKeys = computed(() => {
  const match = menuItems.value.find((i) => i.path === route.path)
  return match ? [match.key] : []
})

function onMenuClick(info: { key: string }) {
  const target = menuItems.value.find((i) => i.key === info.key)
  if (target?.path) {
    router.push(target.path)
  }
}
</script>

<template>
  <div class="gh">
    <div class="gh-left">
      <div class="gh-title">{{ siteTitle }}</div>
      <a-menu
        mode="horizontal"
        :selectedKeys="selectedKeys"
        :items="menuItems.map((i) => ({ key: i.key, label: i.label }))"
        :style="{ background: 'transparent', color: 'rgba(0, 0, 0, 0.88)' }"
        @click="onMenuClick"
      />
    </div>
    <div class="gh-right">
      <a-button type="primary">登录</a-button>
    </div>
  </div>
</template>

<style scoped>
.gh {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  gap: 12px;
}
.gh-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.gh-title {
  font-weight: 600;
  font-size: 16px;
  white-space: nowrap;
}
:deep(.ant-menu) {
  border-bottom: none;
}
@media (max-width: 768px) {
  :deep(.ant-menu) {
    display: none;
  }
}
.gh-right {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
