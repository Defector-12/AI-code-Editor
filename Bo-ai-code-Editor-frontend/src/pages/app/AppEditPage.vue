<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  getAppVoById,
  getAppVoByIdByAdmin,
  updateApp,
  updateAppByAdmin,
} from '@/api/appController.ts'
import { message } from 'ant-design-vue'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import { CODE_GEN_TYPE_OPTIONS, type CodeGenType } from '@/constants/codeGenType.ts'

const route = useRoute()
const router = useRouter()
const appIdStr = String(route.params.id || '')
const form = reactive({
  id: appIdStr as unknown as number | undefined,
  appName: '' as string,
  cover: '' as string,
  priority: undefined as number | undefined,
  codeGenType: undefined as CodeGenType | undefined,
})

const loginUserStore = useLoginUserStore()

const fillForm = (a: API.AppVO) => {
  // 同步 id，避免提交时后端找不到记录
  form.id = (a.id as number | undefined) ?? (appIdStr as unknown as number)
  form.appName = a.appName || ''
  form.cover = a.cover || ''
  form.priority = (a.priority as number | undefined) ?? undefined
  form.codeGenType = (a.codeGenType as CodeGenType) || undefined
}

const fetchData = async () => {
  // 先请求常规接口
  try {
    const res = await getAppVoById({ id: appIdStr as unknown as number })
    if (res.data.code === 0 && res.data.data) {
      fillForm(res.data.data)
      return
    }
  } catch {}
  // 如失败，管理员再尝试管理员接口
  try {
    const resAdmin = await getAppVoByIdByAdmin({ id: appIdStr as unknown as number })
    if (resAdmin.data.code === 0 && resAdmin.data.data) {
      fillForm(resAdmin.data.data)
    }
  } catch {}
}

onMounted(fetchData)

// 如果从详情页点击“编辑信息”进来，为了更好的体验，输入框默认显示当前值
// 已由 fetchData 进行一次回填；如果用户从路由切回触发 keep-alive，可再次手动触发

const saving = ref(false)

async function doSave() {
  // 管理员可改名称/封面/优先级；普通用户仅名称
  saving.value = true
  try {
    if (loginUserStore.loginUser.userRole === 'admin') {
      const res = await updateAppByAdmin({
        id: appIdStr as unknown as number,
        appName: form.appName,
        cover: form.cover,
        priority: form.priority as number | undefined,
        // 若后端暂不接收 codeGenType，可忽略该字段；保留注释说明
        // codeGenType: form.codeGenType as any,
      })
      if (res.data.code === 0) {
        message.success('保存成功')
        router.back()
      } else {
        message.error('保存失败：' + res.data.message)
      }
    } else {
      const res = await updateApp({ id: appIdStr as unknown as number, appName: form.appName })
      if (res.data.code === 0) {
        message.success('保存成功')
        router.back()
      } else {
        message.error('保存失败：' + res.data.message)
      }
    }
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="app-edit">
    <a-card title="编辑应用信息">
      <a-form :model="form" layout="vertical" @finish="doSave">
        <a-form-item label="应用名称" required>
          <a-input v-model:value="form.appName" placeholder="请输入应用名称" />
        </a-form-item>

        <template v-if="loginUserStore.loginUser.userRole === 'admin'">
          <a-form-item label="封面URL">
            <a-input v-model:value="form.cover" placeholder="示例：https://...jpg" />
          </a-form-item>
          <a-form-item label="生成类型">
            <a-select v-model:value="form.codeGenType" placeholder="请选择生成类型">
              <a-select-option
                v-for="opt in CODE_GEN_TYPE_OPTIONS"
                :key="opt.value"
                :value="opt.value"
                >{{ opt.label }}</a-select-option
              >
            </a-select>
          </a-form-item>
          <a-form-item label="优先级">
            <a-input-number v-model:value="form.priority" :min="0" :max="999" style="width: 100%" />
          </a-form-item>
        </template>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="saving">保存</a-button>
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
