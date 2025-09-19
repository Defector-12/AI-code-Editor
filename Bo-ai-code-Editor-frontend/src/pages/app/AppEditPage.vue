<script setup lang="ts">
import { onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAppVoById, updateApp, updateAppByAdmin } from '@/api/appController.ts'
import { message } from 'ant-design-vue'
import { useLoginUserStore } from '@/stores/loginUser.ts'

const route = useRoute()
const router = useRouter()
const appIdStr = String(route.params.id || '')
const form = reactive({
  id: undefined as any,
  appName: '' as string,
  cover: '' as string,
  priority: undefined as number | undefined,
})

const loginUserStore = useLoginUserStore()

const fetchData = async () => {
  const res = await getAppVoById({ id: appIdStr as any })
  if (res.data.code === 0 && res.data.data) {
    const a = res.data.data
    form.appName = a.appName || ''
    form.cover = a.cover || ''
    form.priority = a.priority ?? undefined
  }
}

onMounted(fetchData)

const saving = { value: false }

async function doSave() {
  // 管理员可改名称/封面/优先级；普通用户仅名称
  saving.value = true as any
  try {
    if (loginUserStore.loginUser.userRole === 'admin') {
      const res = await updateAppByAdmin({
        id: appIdStr as any,
        appName: form.appName,
        cover: form.cover,
        priority: form.priority as any,
      })
      if (res.data.code === 0) {
        message.success('保存成功')
        router.back()
      } else {
        message.error('保存失败：' + res.data.message)
      }
    } else {
      const res = await updateApp({ id: appIdStr as any, appName: form.appName })
      if (res.data.code === 0) {
        message.success('保存成功')
        router.back()
      } else {
        message.error('保存失败：' + res.data.message)
      }
    }
  } finally {
    saving.value = false as any
  }
}
</script>

<template>
  <div class="app-edit">
    <a-card title="编辑应用信息">
      <a-form layout="vertical" @finish="doSave">
        <a-form-item label="应用名称" required>
          <a-input v-model:value="form.appName" placeholder="请输入应用名称" />
        </a-form-item>

        <template v-if="loginUserStore.loginUser.userRole === 'admin'">
          <a-form-item label="封面URL">
            <a-input v-model:value="form.cover" placeholder="示例：https://...jpg" />
          </a-form-item>
          <a-form-item label="优先级">
            <a-input-number v-model:value="form.priority" :min="0" :max="999" style="width: 100%" />
          </a-form-item>
        </template>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="saving.value">保存</a-button>
            <a-button @click="router.back()">取消</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>
  </div>
</template>

<style scoped>
.app-edit {
  max-width: 640px;
  margin: 0 auto;
}
</style>
