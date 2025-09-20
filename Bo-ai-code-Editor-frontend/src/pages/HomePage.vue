<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
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

const toWork = (deployKey?: string) => {
  if (!deployKey) return
  const url = `http://localhost/${deployKey}`
  window.open(url, '_blank')
}
</script>

<template>
  <div class="home">
    <div class="hero">
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

    <div class="block">
      <div class="block-header">
        <div class="block-title">我的应用</div>
        <a-input-search
          v-model:value="mySearch.appName"
          placeholder="按名称搜索"
          style="max-width: 280px"
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
      <div class="pager">
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

    <div class="block">
      <div class="block-header">
        <div class="block-title">精选应用</div>
        <a-input-search
          v-model:value="goodSearch.appName"
          placeholder="按名称搜索"
          style="max-width: 280px"
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
      <div class="pager">
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
  max-width: 1200px;
  margin: 0 auto;
}
.hero {
  margin: 16px auto 24px;
  background: transparent;
  padding: 24px;
  border-radius: 12px;
  text-align: center;
}
.title {
  font-size: 28px;
  font-weight: 700;
}
.subtitle {
  color: rgba(0, 0, 0, 0.45);
  margin: 8px 0 16px;
}
.hero-input {
  border: none;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.12);
}
.hero-actions {
  margin-top: 12px;
}

.block {
  margin-top: 24px;
}
.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.block-title {
  font-weight: 600;
  font-size: 18px;
}
.pager {
  display: flex;
  justify-content: center;
  margin: 16px 0;
}

img {
  width: 100%;
  height: 180px;
  object-fit: cover;
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
