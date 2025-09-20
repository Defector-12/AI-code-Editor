<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { listAppVoByPageByAdmin, deleteAppByAdmin, updateAppByAdmin } from '@/api/appController.ts'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { CODE_GEN_TYPE_MAP, CODE_GEN_TYPE_OPTIONS } from '@/constants/codeGenType.ts'

const router = useRouter()

const columns = [
  { title: 'ID', dataIndex: 'id' },
  { title: '名称', dataIndex: 'appName' },
  { title: '封面', dataIndex: 'cover' },
  { title: '生成类型', dataIndex: 'codeGenType' },
  { title: '优先级', dataIndex: 'priority' },
  { title: '创建时间', dataIndex: 'createTime' },
  { title: '操作', key: 'action' },
]

const data = ref<API.AppVO[]>([])
const total = ref(0)
const searchParams = reactive<API.AppQueryRequest>({
  pageNum: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const fetchData = async () => {
  const res = await listAppVoByPageByAdmin({ ...searchParams })
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

const doDelete = async (id?: number) => {
  if (!id) return
  const res = await deleteAppByAdmin({ id })
  if (res.data.code === 0) {
    message.success('删除成功')
    fetchData()
  } else {
    message.error('删除失败：' + res.data.message)
  }
}

const doFeature = async (id?: number) => {
  if (!id) return
  const res = await updateAppByAdmin({ id, priority: 99 })
  if (res.data.code === 0) {
    message.success('已设为精选')
    fetchData()
  }
}

onMounted(fetchData)
</script>

<template>
  <div id="appManagePage">
    <a-form layout="inline" :model="searchParams" @finish="doSearch">
      <a-form-item label="名称">
        <a-input v-model:value="searchParams.appName" placeholder="输入名称" />
      </a-form-item>
      <a-form-item label="生成类型">
        <a-select
          v-model:value="(searchParams as any).codeGenType"
          allow-clear
          placeholder="选择生成类型"
          style="min-width: 160px"
        >
          <a-select-option v-for="opt in CODE_GEN_TYPE_OPTIONS" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </a-select-option>
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
        <template v-if="column.dataIndex === 'cover'">
          <a-image :src="record.cover" :width="120" />
        </template>
        <template v-else-if="column.dataIndex === 'codeGenType'">
          {{
            CODE_GEN_TYPE_MAP[record.codeGenType as keyof typeof CODE_GEN_TYPE_MAP] ||
            record.codeGenType
          }}
        </template>
        <template v-else-if="column.dataIndex === 'createTime'">
          {{ dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') }}
        </template>
        <template v-else-if="column.key === 'action'">
          <a-space>
            <a-button type="link" @click="router.push(`/app/${record.id}/edit`)">编辑</a-button>
            <a-button type="link" danger @click="doDelete(record.id)">删除</a-button>
            <a-button type="link" @click="doFeature(record.id)">精选</a-button>
          </a-space>
        </template>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
#appManagePage {
  width: 100%;
}
</style>
