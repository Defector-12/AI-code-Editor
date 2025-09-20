<script setup lang="ts">
import { onMounted, reactive, ref, watch, nextTick, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  chatToGenCsode,
  deployApp,
  getAppVoById,
  deleteAppByAdmin,
  deleteApp,
} from '@/api/appController.ts'
import { listAppChatHistory } from '@/api/chatHistoryController.ts'
import { message } from 'ant-design-vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import { API_BASE_URL, getStaticPreviewUrl } from '@/env'
import { useLoginUserStore } from '@/stores/loginUser.ts'
import AppInfoModal from '@/components/AppInfoModal.vue'

const route = useRoute()
const router = useRouter()
const appIdStr = String(route.params.id || '')

const app = ref<API.AppVO | undefined>()
const loading = ref(false)
const deploying = ref(false)
const deployedUrl = ref<string>('')
const showInfo = ref(false)

type MsgPiece = { type: 'text' | 'code'; content: string; lang?: string }
type ChatMsg = { role: 'user' | 'ai'; content: string; createTime?: string; pieces?: MsgPiece[] }
const messages = ref<ChatMsg[]>([])
const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: function (str: string, lang: string) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code></pre>`
      }
      return `<pre class="hljs"><code>${hljs.highlightAuto(str).value}</code></pre>`
    } catch (__) {
      return `<pre class="hljs"><code>${str}</code></pre>`
    }
  },
})
const inputText = ref('')
const previewUrl = ref<string>('')
const codeStreamDone = ref(false)
const historyLoading = ref(false)
const historyHasMore = ref(false)
const historyCursor = ref<string | undefined>(undefined)
const totalHistory = ref(0)
const autoScroll = ref(true)
const appIdVal = computed(() => String(app.value?.id ?? route.params.id ?? ''))

const fetchApp = async () => {
  const res = await getAppVoById({ id: appIdStr })
  if (res.data.code === 0) {
    app.value = res.data.data
  }
}

const genDoneKey = `appGenDone:${appIdStr}`
const hasGenDone = () => localStorage.getItem(genDoneKey) === '1'
const markGenDone = () => localStorage.setItem(genDoneKey, '1')

onMounted(async () => {
  await fetchApp()
  await loadInitialHistory()
  // 进入页面时：若历史记录达 2 条或以上，展示网站；否则根据本地标记也可展示
  if (hasGenDone() || totalHistory.value >= 2) {
    codeStreamDone.value = true
    const codeType = (app.value?.codeGenType as string) || 'vite'
    previewUrl.value = `${getStaticPreviewUrl(codeType, appIdStr)}?t=${Date.now()}`
  }
  // 自动发送初始消息：仅当自己的应用且没有对话历史
  if (messages.value.length === 0 && canEdit.value) {
    const init = app.value?.initPrompt || ''
    if (init) {
      inputText.value = init
      await doSend()
    }
  }
})

const scrollRef = ref<HTMLDivElement | null>(null)
watch(messages, async () => {
  await nextTick()
  if (autoScroll.value && scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
})

const loginUserStore = useLoginUserStore()
const canEdit = computed(() => {
  const uid = app.value?.userId
  const me = loginUserStore.loginUser?.id
  return !!uid && !!me && uid === me
})

async function doSend() {
  const text = inputText.value.trim()
  if (!text) return
  if (!canEdit.value) {
    message.warning('无法在别人的作品下对话哦~')
    return
  }
  messages.value.push({ role: 'user', content: text })
  inputText.value = ''
  // SSE
  loading.value = true
  codeStreamDone.value = false
  autoScroll.value = true
  const aiMsgIndex = messages.value.push({ role: 'ai', content: '' }) - 1
  try {
    // 统一走环境变量域名
    const apiBase = (API_BASE_URL || '/api').replace(/\/$/, '')
    const url = `${apiBase}/app/chat/gen/code?appId=${encodeURIComponent(appIdVal.value)}&message=${encodeURIComponent(text)}`
    const es = new EventSource(url, { withCredentials: true })
    es.onmessage = (ev) => {
      // 处理多种结尾标识
      const data = ev.data
      if (data === '[DONE]' || data === 'DONE' || data === 'end') {
        es.close()
        finalizeAfterStream(aiMsgIndex)
        return
      }
      // 某些后端以 JSON 包裹内容，尝试解包常见字段
      let chunk = data
      try {
        const obj = JSON.parse(data)
        if (typeof obj === 'string') chunk = obj
        else if (typeof obj?.d === 'string') chunk = obj.d
        else if (typeof obj?.data === 'string') chunk = obj.data
        else if (typeof obj?.content === 'string') chunk = obj.content
        else if (typeof obj?.text === 'string') chunk = obj.text
      } catch (_) {
        // 非 JSON，直接使用
      }
      messages.value[aiMsgIndex].content += chunk
    }
    es.onerror = () => {
      es.close()
      finalizeAfterStream(aiMsgIndex)
    }
  } catch (e) {
    loading.value = false
  }
}

function finalizeAfterStream(aiMsgIndex: number) {
  loading.value = false
  codeStreamDone.value = true
  // 解析 AI 文本为可读片段（文本 + 代码块）
  const full = messages.value[aiMsgIndex]?.content || ''
  messages.value[aiMsgIndex].pieces = buildPiecesFromContent(full)
  // 标记当前应用已完成一次生成，防止刷新后再次自动触发
  markGenDone()
  // 刷新应用信息以拿到最新 codeGenType / 目录
  fetchApp().then(() => {
    const codeType = (app.value?.codeGenType as string) || 'vite'
    // 加时间戳防缓存
    previewUrl.value = `${getStaticPreviewUrl(codeType, appIdStr)}?t=${Date.now()}`
  })
}

function buildPiecesFromContent(content: string): MsgPiece[] {
  const pieces: MsgPiece[] = []
  // 先按 Markdown 代码块切分
  const regex = /```(\w+)?\n([\s\S]*?)```/g
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = regex.exec(content))) {
    const [block, lang, code] = match
    if (match.index > lastIndex) {
      pieces.push({ type: 'text', content: content.slice(lastIndex, match.index) })
    }
    pieces.push({ type: 'code', content: code, lang: lang || undefined })
    lastIndex = match.index + block.length
  }
  if (lastIndex < content.length) {
    pieces.push({ type: 'text', content: content.slice(lastIndex) })
  }
  // 如果没有 Markdown 代码块，但内容包含完整 HTML，则整体当代码展示
  const joined = pieces
    .map((p) => (p.type === 'code' ? p.content : ''))
    .join('')
    .trim()
  if (pieces.length === 1 && pieces[0].type === 'text') {
    const t = pieces[0].content
    if (/(<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>])/i.test(t) && /<\/html>/i.test(t)) {
      return [{ type: 'code', content: t, lang: 'html' }]
    }
  }
  return pieces
}

function toChatMsg(h: API.ChatHistory): ChatMsg {
  const type = (h.messageType || '').toLowerCase()
  const role: 'user' | 'ai' = type.includes('user') ? 'user' : 'ai'
  return { role, content: h.message || '', createTime: h.createTime }
}

function sortAscByTime(arr: ChatMsg[]) {
  return arr.sort((a, b) => {
    const ta = new Date(a.createTime || 0).getTime()
    const tb = new Date(b.createTime || 0).getTime()
    return ta - tb
  })
}

async function loadInitialHistory() {
  historyLoading.value = true
  autoScroll.value = false
  try {
    const res = await listAppChatHistory({ appId: appIdVal.value })
    if (res.data.code === 0) {
      const page = res.data.data
      totalHistory.value = page?.totalRow || 0
      const list = (page?.records || []).map(toChatMsg)
      const asc = sortAscByTime(list)
      messages.value = asc
      historyHasMore.value = (page?.totalRow || 0) > (page?.records?.length || 0)
      historyCursor.value = asc[0]?.createTime
    }
  } finally {
    historyLoading.value = false
  }
}

async function loadMoreHistory() {
  if (historyLoading.value || !historyHasMore.value) return
  historyLoading.value = true
  autoScroll.value = false
  try {
    const res = await listAppChatHistory({
      appId: appIdVal.value,
      lastCreateTime: historyCursor.value as any,
    })
    if (res.data.code === 0) {
      const page = res.data.data
      const list = (page?.records || []).map(toChatMsg)
      const asc = sortAscByTime(list)
      if (asc.length === 0) {
        historyHasMore.value = false
        return
      }
      messages.value = [...asc, ...messages.value]
      historyHasMore.value = (page?.records?.length || 0) >= 10
      historyCursor.value = asc[0]?.createTime
    }
  } finally {
    historyLoading.value = false
  }
}

async function doDeploy() {
  deploying.value = true
  try {
    const res = await deployApp({ appId: appIdStr as any })
    if (res.data.code === 0) {
      deployedUrl.value = res.data.data || ''
      if (deployedUrl.value) {
        message.success('部署成功')
      }
    } else {
      message.error('部署失败：' + res.data.message)
    }
  } finally {
    deploying.value = false
  }
}

const canManage = computed(() => {
  const isOwner = canEdit.value
  const isAdmin = loginUserStore.loginUser?.userRole === 'admin'
  return isOwner || isAdmin
})

async function doDeleteApp() {
  if (!app.value?.id) return
  const id = app.value.id
  const isAdmin = loginUserStore.loginUser?.userRole === 'admin'
  const res = isAdmin ? await deleteAppByAdmin({ id }) : await deleteApp({ id })
  if (res.data.code === 0) {
    message.success('删除成功')
    showInfo.value = false
    router.push('/')
  } else {
    message.error('删除失败：' + res.data.message)
  }
}
</script>

<template>
  <div class="chat-page">
    <div class="header">
      <div class="app-name">{{ app?.appName || '应用对话' }}</div>
      <div class="actions">
        <a-button @click="showInfo = true">应用详情</a-button>
        <a-button type="primary" :loading="deploying" @click="doDeploy">部署</a-button>
        <a v-if="deployedUrl" :href="deployedUrl" target="_blank">访问部署地址</a>
      </div>
    </div>
    <div class="content">
      <div class="left" :class="{ disabled: !canEdit }">
        <div class="messages" ref="scrollRef">
          <div class="load-more" v-if="historyHasMore">
            <a-button type="link" size="small" :loading="historyLoading" @click="loadMoreHistory"
              >加载更多</a-button
            >
          </div>
          <div v-for="(m, idx) in messages" :key="idx" class="msg" :class="m.role">
            <template v-if="m.role === 'ai'">
              <div class="bubble rich">
                <template v-if="m.pieces && m.pieces.length">
                  <template v-for="(p, i) in m.pieces" :key="i">
                    <div v-if="p.type === 'text'" class="text" v-html="md.render(p.content)"></div>
                    <div
                      v-else
                      v-html="md.render('```' + (p.lang || '') + '\n' + p.content + '\n```')"
                    ></div>
                  </template>
                </template>
                <template v-else>
                  <div v-html="md.render(m.content)"></div>
                </template>
              </div>
            </template>
            <template v-else>
              <div class="bubble">{{ m.content }}</div>
            </template>
          </div>
        </div>
        <div class="input">
          <a-tooltip :title="!canEdit ? '无法在别人的作品下对话哦~' : ''">
            <a-textarea
              v-model:value="inputText"
              :rows="3"
              :disabled="!canEdit"
              placeholder="请描述你想生成的网站，越详细效果越好哦"
            />
          </a-tooltip>
          <div class="send">
            <a-button type="primary" :disabled="!canEdit" :loading="loading" @click="doSend"
              >发送</a-button
            >
          </div>
        </div>
      </div>
      <div class="right">
        <div v-if="codeStreamDone" class="preview">
          <iframe :src="previewUrl" frameborder="0" />
        </div>
        <a-empty v-else description="聊天生成完成或历史达到 2 条后展示预览" />
      </div>
    </div>
  </div>

  <AppInfoModal
    v-model:open="showInfo"
    :app="app"
    :can-manage="canManage"
    @edit="(id) => router.push(`/app/${id}/edit`)"
    @delete="doDeleteApp"
  />
</template>

<style scoped>
.chat-page {
  max-width: 1100px;
  margin: 0 auto;
  overflow-x: hidden;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 12px;
}
.app-name {
  font-weight: 600;
  font-size: 18px;
}
.content {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 8px;
}
.left {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  min-height: 70vh;
}
.messages {
  flex: 1;
  overflow: auto;
  overflow-x: hidden;
  padding: 8px;
}
.load-more {
  text-align: center;
  margin-bottom: 8px;
}
.msg {
  display: flex;
  margin-bottom: 8px;
}
.msg.user {
  justify-content: flex-end;
}
.bubble {
  background: #f5f5f5;
  padding: 8px 12px;
  border-radius: 8px;
  max-width: 70%;
}
.bubble.rich {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.bubble.rich img {
  max-width: 100%;
  height: auto;
}
.bubble.rich table {
  display: block;
  max-width: 100%;
  overflow-x: auto;
}
.bubble.rich * {
  box-sizing: border-box;
}
.bubble.rich .text {
  white-space: pre-wrap;
}
.bubble.rich pre.code {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
  background: #f6f8fa;
  border: 1px solid #f0f0f0;
  padding: 12px;
  border-radius: 8px;
  max-width: 100%;
}
.bubble.rich pre.code code {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}
/* highlight.js 基础样式微调 */
.hljs {
  background: #f6f8fa;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  max-width: 100%;
}
.msg.user .bubble {
  background: #1677ff;
  color: #fff;
}
.input {
  margin-top: 8px;
}
.send {
  text-align: right;
  margin-top: 8px;
}
.right {
  background: #fff;
  border-radius: 8px;
  padding: 8px 12px;
  overflow-x: hidden;
}
.preview {
  width: 100%;
  height: 64vh;
  overflow: hidden;
}
.preview iframe {
  width: 100%;
  height: 100%;
  border: none;
}
@media (max-width: 1024px) {
  .content {
    grid-template-columns: 1fr;
  }
}
</style>
