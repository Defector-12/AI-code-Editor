<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppVoById } from '@/api/appController.ts'

const route = useRoute()
const router = useRouter()
const appIdStr = String(route.params.id || '')
const app = ref<API.AppVO | undefined>()

const fetchData = async () => {
  const res = await getAppVoById({ id: appIdStr as any })
  if (res.data.code === 0) {
    app.value = res.data.data
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="app-detail">
    <a-card :title="app?.appName || '应用详情'">
      <a-space direction="vertical" style="width: 100%">
        <a-image :src="app?.cover || 'https://via.placeholder.com/1200x600?text=Cover'" />
        <a-descriptions bordered :column="1">
          <a-descriptions-item label="ID">{{ app?.id }}</a-descriptions-item>
          <a-descriptions-item label="名称">{{ app?.appName }}</a-descriptions-item>
          <a-descriptions-item label="初始提示词">{{ app?.initPrompt }}</a-descriptions-item>
          <a-descriptions-item label="优先级">{{ app?.priority }}</a-descriptions-item>
        </a-descriptions>
        <a-space>
          <a-button type="primary" @click="router.push(`/app/${app?.id}/chat`)">打开对话</a-button>
          <a-button @click="router.push(`/app/${app?.id}/edit`)">编辑信息</a-button>
        </a-space>
      </a-space>
    </a-card>
  </div>
</template>

<style scoped>
.app-detail {
  max-width: 1000px;
  margin: 0 auto;
}
</style>
