<script setup lang="ts">
import { defineProps, defineEmits } from 'vue'

const props = defineProps<{
  open: boolean
  app?: API.AppVO
  canManage?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', v: boolean): void
  (e: 'edit', id?: number): void
  (e: 'delete', id?: number): void
}>()

const close = () => emit('update:open', false)
</script>

<template>
  <a-modal :open="open" title="应用详情" :footer="null" @cancel="close">
    <a-space direction="vertical" style="width: 100%">
      <a-descriptions bordered :column="1" title="应用基础信息">
        <a-descriptions-item label="创建者">
          <a-space>
            <a-avatar :src="app?.user?.userAvatar" />
            <span>{{ app?.user?.userName || '用户' }}</span>
          </a-space>
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">{{ app?.createTime }}</a-descriptions-item>
      </a-descriptions>
      <div v-if="canManage" style="text-align: right">
        <a-space>
          <a-button @click="emit('edit', app?.id)">修改</a-button>
          <a-popconfirm
            title="确认删除该应用吗？"
            ok-text="删除"
            cancel-text="取消"
            @confirm="emit('delete', app?.id)"
          >
            <a-button danger>删除</a-button>
          </a-popconfirm>
        </a-space>
      </div>
    </a-space>
  </a-modal>
</template>

<style scoped></style>
