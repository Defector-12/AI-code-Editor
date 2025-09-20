<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps<{
  app: API.AppVO
  showEdit?: boolean
}>()

const emit = defineEmits<{
  (e: 'detail', id?: number): void
  (e: 'chat', id?: number): void
  (e: 'work', deployKey?: string): void
  (e: 'edit', id?: number): void
}>()
</script>

<template>
  <a-card :hoverable="true" @click="emit('detail', props.app.id)">
    <template #cover>
      <img :src="props.app.cover || 'https://via.placeholder.com/600x360?text=Cover'" />
    </template>
    <a-card-meta :title="props.app.appName" :description="'作者ID：' + (props.app.userId ?? '-')" />
    <template #actions>
      <a @click.stop="emit('detail', props.app.id)">详情</a>
      <a @click.stop="emit('chat', props.app.id)">对话</a>
      <a v-if="props.app.deployKey" @click.stop="emit('work', props.app.deployKey)">查看作品</a>
      <a v-if="showEdit" @click.stop="emit('edit', props.app.id)">编辑</a>
    </template>
  </a-card>
</template>

<style scoped>
img {
  width: 100%;
  height: 180px;
  object-fit: cover;
}
</style>
