<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { getDeployUrl } from '@/env'
import { addApp, listMyAppVoByPage, listGoodAppVoByPage } from '@/api/appController.ts'
import { message } from 'ant-design-vue'
import AppCard from '@/components/AppCard.vue'

const router = useRouter()

// 创建应用
const creating = ref(false)
const prompt = ref('')

const doCreate = async () => {
  if (!prompt.value?.trim()) {
    message.warning('请输入提示词')
    return
  }
  creating.value = true
  try {
    const res = await addApp({ initPrompt: prompt.value })
    if (res.data.code === 0 && res.data.data) {
      const appId = String(res.data.data)
      message.success('创建成功，进入对话生成')
      router.push({ path: `/app/${appId}/chat`, query: { init: encodeURIComponent(prompt.value) } })
    } else {
      message.error('创建失败：' + res.data.message)
    }
  } finally {
    creating.value = false
  }
}

// 我的应用列表
const mySearch = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 20,
  appName: '',
  sortField: 'createTime',
  sortOrder: 'descend',
})
const myTotal = ref(0)
const myList = ref<API.AppVO[]>([])
const fetchMyList = async () => {
  const res = await listMyAppVoByPage({ ...mySearch })
  if (res.data.code === 0 && res.data.data) {
    myList.value = res.data.data.records ?? []
    myTotal.value = res.data.data.totalRow ?? 0
  }
}

// 精选应用列表
const goodSearch = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 20,
  appName: '',
  sortField: 'createTime',
  sortOrder: 'descend',
})
const goodTotal = ref(0)
const goodList = ref<API.AppVO[]>([])
const fetchGoodList = async () => {
  const res = await listGoodAppVoByPage({ ...goodSearch })
  if (res.data.code === 0 && res.data.data) {
    goodList.value = res.data.data.records ?? []
    goodTotal.value = res.data.data.totalRow ?? 0
  }
}

onMounted(() => {
  fetchMyList()
  fetchGoodList()
})

const myPagination = computed(() => ({
  current: mySearch.pageNum ?? 1,
  pageSize: mySearch.pageSize ?? 20,
  total: myTotal.value,
  showTotal: (t: number) => `共 ${t} 条`,
}))

const goodPagination = computed(() => ({
  current: goodSearch.pageNum ?? 1,
  pageSize: goodSearch.pageSize ?? 20,
  total: goodTotal.value,
  showTotal: (t: number) => `共 ${t} 条`,
}))

const toDetail = (id?: number) => {
  if (!id) return
  router.push(`/app/${id}`)
}

const toChat = (id?: number) => {
  if (!id) return
  router.push({ path: `/app/${id}/chat`, query: { view: '1' } })
}

const toEdit = (id?: number) => {
  if (!id) return
  router.push(`/app/${id}/edit`)
}

const toWork = (deployKey?: string, codeGenType?: string) => {
  if (!deployKey) return
  const url = getDeployUrl(deployKey, codeGenType)
  window.open(url, '_blank')
}

const sections = [
  {
    key: 'my',
    title: '我的应用',
    searchModel: mySearch,
    onSearch: () => {
      mySearch.pageNum = 1
      fetchMyList()
    },
    list: myList,
    pagination: myPagination,
    showEdit: true,
  },
  {
    key: 'good',
    title: '精选应用',
    searchModel: goodSearch,
    onSearch: () => {
      goodSearch.pageNum = 1
      fetchGoodList()
    },
    list: goodList,
    pagination: goodPagination,
    showEdit: false,
  },
]
</script>

<template>
  <div class="home">
    <div class="hero glass-surface">
      <div class="title">AI 应用生成平台</div>
      <div class="subtitle">一句话轻松创建网站应用</div>
      <a-textarea
        v-model:value="prompt"
        placeholder="帮我创建个人博客网站"
        :rows="3"
        class="hero-input"
      />
      <div class="hero-actions">
        <a-button type="primary" size="large" :loading="creating" @click="doCreate"
          >开始生成</a-button
        >
      </div>
    </div>

    <div class="block glass-surface">
      <div class="block-header">
        <div class="block-title">我的应用</div>
        <a-input-search
          v-model:value="mySearch.appName"
          placeholder="按名称搜索"
          @search="
            () => {
              mySearch.pageNum = 1
              fetchMyList()
            }
          "
        />
      </div>
      <a-list :grid="{ gutter: 16, column: 4 }" :data-source="myList">
        <template #renderItem="{ item }">
          <a-list-item>
            <AppCard
              :app="item"
              :showEdit="true"
              @detail="toDetail"
              @chat="toChat"
              @work="toWork"
              @edit="toEdit"
            />
          </a-list-item>
        </template>
      </a-list>
      <div class="pager" v-if="myPagination.total">
        <a-pagination
          v-bind="myPagination"
          @change="
            (p: number, s: number) => {
              mySearch.pageNum = p
              mySearch.pageSize = s
              fetchMyList()
            }
          "
        />
      </div>
    </div>

    <div class="block glass-surface">
      <div class="block-header">
        <div class="block-title">精选应用</div>
        <a-input-search
          v-model:value="goodSearch.appName"
          placeholder="按名称搜索"
          @search="
            () => {
              goodSearch.pageNum = 1
              fetchGoodList()
            }
          "
        />
      </div>
      <a-list :grid="{ gutter: 16, column: 4 }" :data-source="goodList">
        <template #renderItem="{ item }">
          <a-list-item>
            <AppCard :app="item" @detail="toDetail" @chat="toChat" @work="toWork" />
          </a-list-item>
        </template>
      </a-list>
      <div class="pager" v-if="goodPagination.total">
        <a-pagination
          v-bind="goodPagination"
          @change="
            (p: number, s: number) => {
              goodSearch.pageNum = p
              goodSearch.pageSize = s
              fetchGoodList()
            }
          "
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  margin: 0 auto;
  padding-bottom: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

.hero {
  width: min(80%, 1200px);
  margin: 24px auto 0;
  padding: 32px 48px;
  border-radius: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  inset: -20% 20%;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.18), transparent 65%);
  opacity: 0.85;
  filter: blur(60px);
  pointer-events: none;
}

.title {
  font-size: 36px;
  font-weight: 700;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  margin: 8px 0 24px;
  font-size: 16px;
}

.hero-input {
  border: 1px solid rgba(177, 140, 255, 0.28) !important;
  background: rgba(15, 6, 28, 0.55) !important;
  border-radius: 16px !important;
  box-shadow: 0 18px 32px rgba(8, 2, 20, 0.45);
}

.hero-actions {
  margin-top: 18px;
}

.block {
  width: min(80%, 1200px);
  padding: 24px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  backdrop-filter: blur(calc(var(--blur-strength) * 0.8));
}

.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.block-title {
  font-weight: 600;
  font-size: 20px;
  color: var(--accent-strong);
  letter-spacing: 0.03em;
}

.pager {
  display: flex;
  justify-content: center;
  margin: 8px 0 4px;
}

:deep(.ant-input-search) {
  max-width: 300px;
}

:deep(.ant-input-search .ant-input) {
  border-radius: 14px !important;
}

:deep(.ant-list-grid .ant-row) {
  row-gap: 18px !important;
}

img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 16px;
}

@media (max-width: 1024px) {
  .hero {
    padding: 24px;
  }

  .block {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .home {
    padding: 0 12px 80px;
  }

  .hero,
  .block {
    width: 100%;
  }

  .hero {
    padding: 20px 16px;
  }

  .title {
    font-size: 28px;
  }

  :deep(.ant-list-grid .ant-row) {
    row-gap: 12px !important;
  }

  :deep(.ant-list-grid .ant-col) {
    width: 100% !important;
  }
}
/* 页面级渐变背景 */
:root,
body,
html {
  background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);
}
/* 内容区域保持透明以呈现背景 */
:deep(.ant-layout-content) {
  background: transparent;
}
</style>
