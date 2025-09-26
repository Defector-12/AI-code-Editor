<script setup lang="ts">
import { onMounted, reactive, ref, computed } from 'vue'
import { listAllChatHistoryByPageForAdmin } from '@/api/chatHistoryController.ts'
import dayjs from 'dayjs'

const columns = [
  { title: 'ID', dataIndex: 'id' },
  { title: '应用ID', dataIndex: 'appId' },
  { title: '用户ID', dataIndex: 'userId' },
  { title: '类型', dataIndex: 'messageType' },
  { title: '内容', dataIndex: 'message' },
  { title: '创建时间', dataIndex: 'createTime' },
]

const data = ref<API.ChatHistory[]>([])
const total = ref(0)
const searchParams = reactive<API.ChatHistoryQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const fetchData = async () => {
  const res = await listAllChatHistoryByPageForAdmin({ ...searchParams })
  if (res.data.code === 0 && res.data.data) {
    data.value = res.data.data.records ?? []
    total.value = res.data.data.totalRow ?? 0
  }
}

const pagination = computed(() => ({
  current: searchParams.pageNum ?? 1,
  pageSize: searchParams.pageSize ?? 10,
  total: total.value,
  showSizeChanger: true,
  showTotal: (t: number) => `共 ${t} 条`,
}))

const doTableChange = (page: any) => {
  searchParams.pageNum = page.current
  searchParams.pageSize = page.pageSize
  fetchData()
}

const doSearch = () => {
  searchParams.pageNum = 1
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div id="chatManagePage" class="glass-surface">
    <a-form layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="应用ID">
        <a-input-number v-model:value="searchParams.appId" :min="1" style="width: 160px" />
      </a-form-item>
      <a-form-item label="用户ID">
        <a-input-number v-model:value="searchParams.userId" :min="1" style="width: 160px" />
      </a-form-item>
      <a-form-item label="类型">
        <a-select
          v-model:value="searchParams.messageType"
          allow-clear
          placeholder="选择类型"
          style="min-width: 140px"
        >
          <a-select-option value="USER">用户</a-select-option>
          <a-select-option value="AI">AI</a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit">搜索</a-button>
      </a-form-item>
    </a-form>
    <a-divider />
    <a-table
      :columns="columns"
      :data-source="data"
      :pagination="pagination"
      @change="doTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'message'">
          <a-typography-paragraph :ellipsis="{ rows: 2 }">{{
            record.message
          }}</a-typography-paragraph>
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
#chatManagePage {
  width: 100%;
  padding: 24px;
  border-radius: 22px;
  border: 1px solid rgba(177, 140, 255, 0.18);
  backdrop-filter: blur(var(--blur-strength));
  box-shadow: var(--shadow-card);
}

@media (max-width: 768px) {
  #chatManagePage {
    padding: 16px;
  }
}
</style>
