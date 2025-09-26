<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps<{
  app: API.AppVO
  showEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'detail', id?: number): void
  (e: 'chat', id?: number): void
  (e: 'work', deployKey?: string, codeGenType?: string): void
  (e: 'edit', id?: number): void
}>()
</script>

<template>
  <a-card :hoverable="true" class="app-card" @click="emit('detail', props.app.id)">
    <template #cover>
      <img :src="props.app.cover || 'https://via.placeholder.com/600x360?text=Cover'" />
    </template>
    <a-card-meta :title="props.app.appName" :description="'作者ID：' + (props.app.userId ?? '-')" />
    <template #actions>
      <a @click.stop="emit('detail', props.app.id)">详情</a>
      <a @click.stop="emit('chat', props.app.id)">对话</a>
      <a
        v-if="props.app.deployKey"
        @click.stop="emit('work', props.app.deployKey, props.app.codeGenType as string)"
        >查看作品</a
      >
      <a v-if="showEdit" @click.stop="emit('edit', props.app.id)">编辑</a>
    </template>
  </a-card>
</template>

<style scoped>
.app-card {
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid rgba(177, 140, 255, 0.18) !important;
  background: rgba(21, 10, 34, 0.65) !important;
  backdrop-filter: blur(calc(var(--blur-strength) * 0.9));
  box-shadow: var(--shadow-card) !important;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease;
}

.app-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(10, 4, 22, 0.55) !important;
}

.app-card :deep(.ant-card-body) {
  color: var(--text-secondary);
}

.app-card :deep(.ant-card-meta-title) {
  color: var(--text-primary);
  font-weight: 600;
  letter-spacing: 0.02em;
}

.app-card :deep(.ant-card-meta-description) {
  color: var(--text-tertiary);
}

.app-card :deep(.ant-card-actions) {
  background: rgba(11, 4, 20, 0.55);
  border-top: 1px solid rgba(177, 140, 255, 0.12);
}

.app-card :deep(.ant-card-actions li a) {
  color: #fbfbfb;
  transition:
    color 0.2s ease,
    text-shadow 0.2s ease;
}

.app-card :deep(.ant-card-actions li a:hover) {
  color: var(--accent-glow);
  text-shadow: 0 0 8px var(--accent-glow);
}

img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  filter: saturate(110%);
  transition:
    transform 0.3s ease,
    filter 0.3s ease;
}

.app-card:hover img {
  transform: scale(1.02);
  filter: saturate(125%);
}
</style>
