<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppVoById } from '@/api/appController.ts'
import { getAppVoByIdByAdmin } from '@/api/appController.ts'
import { getDeployUrl } from '@/env'
import { CODE_GEN_TYPE_MAP } from '@/constants/codeGenType.ts'

const route = useRoute()
const router = useRouter()
const appIdStr = String(route.params.id || '')
const app = ref<API.AppVO | undefined>()

const fetchData = async () => {
  try {
    const res = await getAppVoById({ id: Number(appIdStr) })
    if (res.data.code === 0 && res.data.data) {
      app.value = res.data.data
      return
    }
  } catch (error) {}

  try {
    const resAdmin = await getAppVoByIdByAdmin({ id: Number(appIdStr) })
    if (resAdmin.data.code === 0 && resAdmin.data.data) {
      app.value = resAdmin.data.data
    }
  } catch (error) {}
}

onMounted(fetchData)

function openWork() {
  const key = app.value?.deployKey
  if (!key) return
  const url = getDeployUrl(key, app.value?.codeGenType as string | undefined)
  window.open(url, '_blank')
}

const codeGenTypeLabel = computed(() => {
  const t = app.value?.codeGenType as keyof typeof CODE_GEN_TYPE_MAP | undefined
  if (!t) return undefined
  return CODE_GEN_TYPE_MAP[t] || (t as unknown as string)
})
</script>

<template>
  <div class="app-detail glass-surface">
    <a-card class="detail-card" :title="app?.appName || '应用详情'">
      <template #extra>
        <a-tag v-if="codeGenTypeLabel" color="blue">{{ codeGenTypeLabel }}</a-tag>
      </template>
      <a-space direction="vertical" style="width: 100%">
        <a-image
          class="app-cover"
          :src="app?.cover || 'https://via.placeholder.com/1200x600?text=Cover'"
          :fallback="'https://via.placeholder.com/1200x600?text=Cover'"
          :preview="!!app?.cover"
        />
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="ID">{{ app?.id }}</a-descriptions-item>
          <a-descriptions-item label="名称">{{ app?.appName }}</a-descriptions-item>
          <a-descriptions-item label="初始提示词">{{ app?.initPrompt }}</a-descriptions-item>
          <a-descriptions-item label="优先级">{{ app?.priority }}</a-descriptions-item>
        </a-descriptions>
        <a-space>
          <a-button type="primary" @click="router.push({ path: `/app/${app?.id}/chat` })"
            >打开对话</a-button
          >
          <a-button v-if="app?.deployKey" @click="openWork">查看作品</a-button>
          <a-button @click="router.push(`/app/${app?.id}/edit`)">编辑信息</a-button>
        </a-space>
      </a-space>
    </a-card>
  </div>
</template>

<style scoped>
.app-detail {
  width: 90%;
  max-width: 1200px;
  margin: 48px auto;
  padding: 32px;
  border-radius: 26px;
  border: 1px solid rgba(177, 140, 255, 0.18);
  backdrop-filter: blur(var(--blur-strength));
  box-shadow: var(--shadow-card);
}

.detail-card {
  background: rgba(26, 12, 46, 0.62) !important;
  border-radius: 22px !important;
  overflow: hidden;
}

.app-cover {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  border-radius: 18px;
}

::deep(.ant-descriptions-bordered) {
  border-color: var(--surface-divider) !important;
  background: rgba(12, 6, 24, 0.45);
}

::deep(.ant-descriptions-bordered .ant-descriptions-item-label) {
  color: var(--text-tertiary) !important;
}

::deep(.ant-descriptions-item-content) {
  color: var(--text-secondary) !important;
}

::deep(.ant-space) {
  gap: 16px !important;
}

@media (max-width: 768px) {
  .app-detail {
    width: 100%;
    padding: 20px 16px;
    margin: 24px auto;
  }

  .app-cover {
    max-height: 240px;
  }
}
</style>
