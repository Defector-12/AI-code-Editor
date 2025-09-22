<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue'
import { CODE_GEN_TYPE_MAP } from '@/constants/codeGenType.ts'

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

const codeGenTypeLabel = computed(() => {
  const t = props.app?.codeGenType as keyof typeof CODE_GEN_TYPE_MAP | undefined
  if (!t) return undefined
  return CODE_GEN_TYPE_MAP[t] || (t as unknown as string)
})
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
        <a-descriptions-item label="生成类型">
          <a-tag v-if="codeGenTypeLabel" color="blue">{{ codeGenTypeLabel }}</a-tag>
          <span v-else>未设置</span>
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
